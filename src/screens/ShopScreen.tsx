import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Text, Card } from '../components';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../contexts/CartContext';
import { mockProducts } from '../data/mockProducts';
import { spacing, colors, borderRadius } from '../utils/theme';
import { Product, RootStackParamList } from '../types';

type ShopScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

export const ShopScreen: React.FC = () => {
  const navigation = useNavigation<ShopScreenNavigationProp>();
  const { addItem } = useCart();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return mockProducts;
    }
    
    const query = searchQuery.toLowerCase();
    return mockProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
    // Could show a toast notification here
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item)}
      onAddToCart={() => handleAddToCart(item)}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text variant="heading1" style={styles.title}>
        🌱 Farm Stand
      </Text>
      
      <Card variant="elevated" style={styles.searchCard}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.text.tertiary}
        />
      </Card>

      <View style={styles.resultsHeader}>
        <Text variant="heading3">
          {searchQuery ? `Search Results (${filteredProducts.length})` : 'All Products'}
        </Text>
        {searchQuery && (
          <Text variant="body" color="secondary">
            Showing results for "{searchQuery}"
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="heading3" align="center">
        🔍 No products found
      </Text>
      <Text variant="body" color="secondary" align="center" style={styles.emptyText}>
        Try adjusting your search terms or browse all products.
      </Text>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  searchCard: {
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  searchInput: {
    fontSize: 16,
    padding: spacing.sm,
    color: colors.text.primary,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  resultsHeader: {
    marginBottom: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
