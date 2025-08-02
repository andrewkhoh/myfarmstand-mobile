import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Text as RNText } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Card, Button } from '../components';
import { useCart } from '../hooks/useCart';
import { spacing, colors, borderRadius } from '../utils/theme';
import { CartItem, RootStackParamList } from '../types';

type CartScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Checkout'>;

export const CartScreen: React.FC = () => {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const navigation = useNavigation<CartScreenNavigationProp>();

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string) => {
    const item = items.find(item => item.product.id === productId);
    if (item) {
      Alert.alert(
        'Remove Item',
        `Remove ${item.product.name} from your cart?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => removeItem(productId)
          }
        ]
      );
    }
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: clearCart
        }
      ]
    );
  };

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const itemTotal = item.product.price * item.quantity;
    const isOutOfStock = item.product.stock === 0;
    const maxQuantity = Math.min(item.product.stock, 99); // Reasonable max

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
            {item.product.unit && (
              <Text variant="caption" color="tertiary">
                per {item.product.unit}
              </Text>
            )}
            {isOutOfStock && (
              <Text variant="caption" style={styles.outOfStockText}>
                ⚠️ Out of Stock
              </Text>
            )}
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
                  item.quantity >= maxQuantity && styles.quantityButtonDisabled
                ]}
                onPress={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                disabled={item.quantity >= maxQuantity || isOutOfStock}
              >
                <Ionicons 
                  name="add" 
                  size={16} 
                  color={item.quantity >= maxQuantity || isOutOfStock ? colors.text.tertiary : colors.primary[600]} 
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
      {items.length > 0 && (
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
