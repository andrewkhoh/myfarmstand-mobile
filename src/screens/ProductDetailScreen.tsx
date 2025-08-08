import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Screen, Text, Button, Card } from '../components';
import { useProductById } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { getStockDisplayInfo } from '../utils/stockDisplay';
import { spacing, colors, borderRadius } from '../utils/theme';
import { Product } from '../types';

type ProductDetailRouteProp = RouteProp<{ ProductDetail: { productId: string } }, 'ProductDetail'>;

export const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation();
  const { addItem, getCartQuantity } = useCart();
  
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const productId = route.params?.productId || '';
  const { data: product, isLoading, error } = useProductById(productId);

  // Show loading state
  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text variant="heading3" align="center">Loading product...</Text>
        </View>
      </Screen>
    );
  }

  // Show error state
  if (error) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text variant="heading2" align="center" color="error">Error Loading Product</Text>
          <Text variant="body" color="secondary" align="center" style={styles.errorText}>
            {error.message}
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </Screen>
    );
  }

  // Show not found state
  if (!product) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text variant="heading2" align="center">Product Not Found</Text>
          <Text variant="body" color="secondary" align="center" style={styles.errorText}>
            The product you're looking for doesn't exist.
          </Text>
          <Button
            title="Back to Shop"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </Screen>
    );
  }

  // Use centralized stock display utility for consistency
  const cartQuantity = getCartQuantity(product.id);
  const { availableStock, isOutOfStock, lowStockWarning, stockColor, stockMessage, canAddToCart, addToCartButtonText } = 
    getStockDisplayInfo(product, cartQuantity, 'full');

  const handleAddToCart = async () => {
    try {
      // Server-side validation will handle stock checking
      await addItem({ product, quantity: 1 });
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container}>
        <View style={styles.imageContainer}>
          {Boolean(imageLoading) && (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text variant="body" color="secondary">Loading image...</Text>
            </View>
          )}
          <Image
            source={{ 
              uri: imageError || !product.imageUrl 
                ? 'https://via.placeholder.com/400x400/e5e7eb/6b7280?text=Organic+Tomatoes'
                : product.imageUrl 
            }}
            style={[styles.image, imageLoading && { position: 'absolute' }]}
            resizeMode="cover"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
          
          {/* Badges */}
          <View style={styles.badgeContainer}>
            {product.isWeeklySpecial && (
              <View style={styles.specialBadge}>
                <Text variant="caption" color="inverse" weight="bold">
                  WEEKLY SPECIAL
                </Text>
              </View>
            )}
            {product.isBundle && (
              <View style={styles.bundleBadge}>
                <Text variant="caption" color="inverse" weight="bold">
                  BUNDLE DEAL
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="heading1" style={styles.name}>
              {product.name}
            </Text>
            <Text variant="heading2" color="primary" weight="bold">
              ${product.price.toFixed(2)}
            </Text>
          </View>

          <Card variant="default" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text variant="body" weight="medium">Category:</Text>
              <Text variant="body" color="secondary">{product.categoryId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="body" weight="medium">Stock:</Text>
              <View style={styles.stockInfo}>
                <Text variant="body" color={stockColor}>
                  {stockMessage}
                </Text>
                {Boolean(lowStockWarning) && (
                  <Text variant="caption" color={stockColor} weight="medium" style={{ marginTop: 2 }}>
                    {lowStockWarning}
                  </Text>
                )}
              </View>
            </View>
            {Boolean(product.seasonalAvailability) && (
              <View style={styles.infoRow}>
                <Text variant="body" weight="medium">Seasonal:</Text>
                <Text variant="body" color="success">In season</Text>
              </View>
            )}
          </Card>

          <Card variant="elevated" style={styles.descriptionCard}>
            <Text variant="heading3" style={styles.sectionTitle}>
              Description
            </Text>
            <Text variant="body" style={styles.description}>
              {product.description}
            </Text>
          </Card>

          <View style={styles.actions}>
            <Button
              title={addToCartButtonText}
              variant="primary"
              onPress={handleAddToCart}
              disabled={!canAddToCart}
              style={styles.addToCartButton}
            />
            <Button
              title="Back to Shop"
              variant="outline"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 300,
    backgroundColor: colors.neutral[100],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specialBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  bundleBadge: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  name: {
    marginBottom: spacing.sm,
  },
  infoCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stockInfo: {
    flexDirection: 'column',
  },
  descriptionCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  description: {
    lineHeight: 24,
  },
  actions: {
    gap: spacing.md,
  },
  addToCartButton: {
    marginBottom: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
});
