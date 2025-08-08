import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Product } from '../types';
import { Text } from './Text';
import { Button } from './Button';
import { Card } from './Card';
import { getStockDisplayInfo } from '../utils/stockDisplay';
import { spacing, colors, borderRadius } from '../utils/theme';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
  cartQuantity?: number; // Cart quantity for stock calculation
  canAddToCart?: boolean; // Real-time stock validation result
  stockStatusMessage?: string; // Real-time stock status message
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  cartQuantity = 0, // Default to 0 if not provided
  canAddToCart = true, // Default to true for backward compatibility
  stockStatusMessage, // Real-time stock status message
}) => {
  // Use centralized stock display utility for consistency (compact variant for cards)
  const { availableStock, isOutOfStock, lowStockWarning, stockColor, stockMessage, canAddToCart: centralizedCanAddToCart, addToCartButtonText } = 
    getStockDisplayInfo(product, cartQuantity, 'compact');

  return (
    <Card variant="elevated" style={styles.container}>
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image' }}
            style={styles.image}
            resizeMode="cover"
          />
          {Boolean(product.isWeeklySpecial) && (
            <View style={styles.specialBadge}>
              <Text variant="caption" color="inverse" weight="bold">
                SPECIAL
              </Text>
            </View>
          )}
          {Boolean(product.isBundle) && (
            <View style={styles.bundleBadge}>
              <Text variant="caption" color="inverse" weight="bold">
                BUNDLE
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text variant="heading3" style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          
          <Text variant="body" color="secondary" style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text variant="heading3" color="primary" weight="bold">
                ${product.price.toFixed(2)}
              </Text>
              <View style={{ flexDirection: 'column' }}>
                <Text variant="caption" color={stockColor}>
                  {isOutOfStock ? 'Out of stock' : `${availableStock} available`}
                  {Boolean(cartQuantity > 0) && ` (${cartQuantity} in cart)`}
                </Text>
                {Boolean(lowStockWarning) && (
                  <Text variant="caption" color={stockColor} weight="medium" style={{ marginTop: 1 }}>
                    {lowStockWarning}
                  </Text>
                )}
              </View>
            </View>

            <Button
              title={addToCartButtonText}
              variant="primary"
              onPress={onAddToCart}
              disabled={!centralizedCanAddToCart}
              style={styles.addButton}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  touchable: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: colors.neutral[100],
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  specialBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  bundleBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.info,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  content: {
    padding: spacing.md,
  },
  name: {
    marginBottom: spacing.xs,
  },
  description: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceContainer: {
    flex: 1,
  },
  addButton: {
    marginLeft: spacing.sm,
    minWidth: 100,
  },
});
