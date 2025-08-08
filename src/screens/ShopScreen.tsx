import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, TextInput, RefreshControl, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Card, Button } from '../components';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../hooks/useCart';
import { useProducts, useCategories } from '../hooks/useProducts';
import { spacing, colors, borderRadius } from '../utils/theme';
import { Product, RootStackParamList } from '../types';

type ShopScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

type SortOption = 'name' | 'price-low' | 'price-high' | 'category';

export const ShopScreen: React.FC = () => {
  const navigation = useNavigation<ShopScreenNavigationProp>();
  const { addItem, getCartQuantity } = useCart(); // Use centralized getCartQuantity from useCart
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Get real data from Supabase
  const { data: products = [], isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
  const { data: categoriesData = [], isLoading: categoriesLoading } = useCategories();

  // Get unique categories
  const categories = useMemo(() => {
    const categoryNames = categoriesData.map(cat => cat.name);
    return ['all', ...categoryNames];
  }, [categoriesData]);



  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Apply category filter
    if (selectedCategory !== 'all') {
      // Filter by category name (database stores category as string name, not ID)
      filtered = filtered.filter((product: Product) => {
        // Handle both possible data structures for compatibility
        const productCategory = (product as any).category || product.categoryId;
        return productCategory === selectedCategory;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product: Product) => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        (product.tags && product.tags.some((tag: string) => tag.toLowerCase().includes(query)))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'category':
          // Sort by category name (database stores category as string name)
          const aCategoryName = (a as any).category || a.categoryId || '';
          const bCategoryName = (b as any).category || b.categoryId || '';
          return aCategoryName.localeCompare(bCategoryName);
        default:
          return 0;
      }
    });

    return sorted;
  }, [searchQuery, selectedCategory, sortBy, products, categoriesData]);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const handleAddToCart = (product: Product) => {
    try {
      // Use direct mutation - React Query handles optimistic updates and error handling
      addItem({ product, quantity: 1 });
    } catch (error) {
      console.error('Failed to add item to cart:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchProducts();
    } catch (error) {
      console.error('Error refreshing products:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'name': return 'Name A-Z';
      case 'price-low': return 'Price: Low to High';
      case 'price-high': return 'Price: High to Low';
      case 'category': return 'Category';
      default: return 'Name A-Z';
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item)}
      onAddToCart={() => handleAddToCart(item)}
      cartQuantity={getCartQuantity(item.id)} // Pass cart quantity for stock calculation
    />
  );

  const renderCategoryChip = (category: string) => {
    const isSelected = selectedCategory === category;
    const displayName = category === 'all' ? 'All Products' : category;
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryChip,
          isSelected && styles.categoryChipSelected
        ]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text 
          variant="caption" 
          style={[
            styles.categoryChipText,
            isSelected && styles.categoryChipTextSelected
          ] as any}
        >
          {displayName}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSortOption = (option: SortOption) => {
    const isSelected = sortBy === option;
    
    return (
      <TouchableOpacity
        key={option}
        style={[
          styles.sortOption,
          isSelected && styles.sortOptionSelected
        ]}
        onPress={() => setSortBy(option)}
      >
        <Text 
          variant="body" 
          style={[
            styles.sortOptionText,
            isSelected && styles.sortOptionTextSelected
          ] as any}
        >
          {getSortLabel(option)}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark" size={16} color={colors.primary[600]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text variant="heading1" style={styles.title}>
        🌱 Farm Stand
      </Text>
      
      <Card variant="elevated" style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.tertiary}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name={showFilters ? "options" : "options-outline"} 
              size={20} 
              color={colors.primary[600]} 
            />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Category Navigation */}
      <View style={styles.categorySection}>
        <Text variant="heading3" style={styles.sectionTitle}>Categories</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map(renderCategoryChip)}
        </ScrollView>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <Card variant="elevated" style={styles.filtersCard}>
          <View style={styles.filtersHeader}>
            <Text variant="heading3">Sort By</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.sortOptions}>
            {(['name', 'price-low', 'price-high', 'category'] as SortOption[]).map(renderSortOption)}
          </View>
        </Card>
      )}

      <View style={styles.resultsHeader}>
        <Text variant="heading3">
          {searchQuery || selectedCategory !== 'all' 
            ? `Results (${filteredAndSortedProducts.length})` 
            : 'All Products'
          }
        </Text>
        {searchQuery && (
          <Text variant="body" color="secondary">
            Showing results for "{searchQuery}"
          </Text>
        )}
        {selectedCategory !== 'all' && !searchQuery && (
          <Text variant="body" color="secondary">
            Category: {selectedCategory}
          </Text>
        )}
        <Text variant="caption" color="tertiary">
          Sorted by: {getSortLabel(sortBy)}
        </Text>
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

  // Show loading state
  if (productsLoading || categoriesLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text variant="heading3" align="center">Loading products...</Text>
        </View>
      </Screen>
    );
  }

  // Show error state
  if (productsError) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text variant="heading3" align="center" color="error">Error loading products</Text>
          <Text variant="body" align="center" color="secondary" style={{ marginTop: 8 }}>
            {productsError.message}
          </Text>
          <Button 
            title="Retry" 
            onPress={() => refetchProducts()} 
            style={{ marginTop: 16 }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={filteredAndSortedProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[600]]}
            tintColor={colors.primary[600]}
          />
        }
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: spacing.sm,
    color: colors.text.primary,
  },
  filterButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  categorySection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    marginBottom: spacing.sm,
  },
  categoryScrollContent: {
    paddingHorizontal: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  categoryChipTextSelected: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  filtersCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sortOptions: {
    gap: spacing.sm,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sortOptionSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  sortOptionText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  sortOptionTextSelected: {
    color: colors.primary[600],
    fontWeight: '600',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
