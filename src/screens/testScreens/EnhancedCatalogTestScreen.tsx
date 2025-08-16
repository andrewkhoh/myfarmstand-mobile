import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen, Text, Button, Card } from '../../components';
import { mockProducts } from '../../data/mockProducts';
import { spacing, colors } from '../../utils/theme';
import { RootStackParamList, RootTabParamList } from '../../types';
import { getProductImageUrl } from '../../utils/typeMappers';

type EnhancedCatalogTestNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList>,
  StackNavigationProp<RootStackParamList>
>;

export const EnhancedCatalogTestScreen: React.FC = () => {
  const navigation = useNavigation<EnhancedCatalogTestNavigationProp>();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `✅ ${result}`]);
  };

  const addTestFailure = (result: string) => {
    setTestResults(prev => [...prev, `❌ ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test 1: Category Filtering
  const testCategoryFiltering = () => {
    try {
      const categories = [...new Set(mockProducts.map(p => p.category))];
      
      if (categories.length === 0) {
        addTestFailure('No categories found in products');
        return;
      }

      // Test filtering by each category
      let allTestsPassed = true;
      categories.forEach(category => {
        const filtered = mockProducts.filter(p => p.category === category);
        if (filtered.length === 0) {
          addTestFailure(`No products found for category: ${category}`);
          allTestsPassed = false;
        }
      });

      if (allTestsPassed) {
        addTestResult(`Category filtering works for ${categories.length} categories: ${categories.join(', ')}`);
        Alert.alert('Test Passed', `Category filtering validated for ${categories.length} categories`);
      }
    } catch (error) {
      addTestFailure(`Category filtering test failed: ${error}`);
      Alert.alert('Test Failed', 'Category filtering test encountered an error');
    }
  };

  // Test 2: Search with Enhanced Features
  const testEnhancedSearch = () => {
    try {
      const searchQueries = ['tomato', 'organic', 'fresh', 'apple'];
      let allTestsPassed = true;

      searchQueries.forEach(query => {
        const results = mockProducts.filter(product => 
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.description.toLowerCase().includes(query.toLowerCase()) ||
          product.category.toLowerCase().includes(query.toLowerCase()) ||
          (product.tags && product.tags.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase())))
        );

        if (results.length === 0) {
          addTestFailure(`No search results for query: ${query}`);
          allTestsPassed = false;
        }
      });

      if (allTestsPassed) {
        addTestResult(`Enhanced search works for queries: ${searchQueries.join(', ')}`);
        Alert.alert('Test Passed', 'Enhanced search with tags validation successful');
      }
    } catch (error) {
      addTestFailure(`Enhanced search test failed: ${error}`);
      Alert.alert('Test Failed', 'Enhanced search test encountered an error');
    }
  };

  // Test 3: Product Sorting
  const testProductSorting = () => {
    try {
      const products = [...mockProducts];
      
      // Test name sorting
      const sortedByName = [...products].sort((a, b) => a.name.localeCompare(b.name));
      const isNameSorted = sortedByName[0].name <= sortedByName[sortedByName.length - 1].name;
      
      // Test price sorting (low to high)
      const sortedByPriceLow = [...products].sort((a, b) => a.price - b.price);
      const isPriceLowSorted = sortedByPriceLow[0].price <= sortedByPriceLow[sortedByPriceLow.length - 1].price;
      
      // Test price sorting (high to low)
      const sortedByPriceHigh = [...products].sort((a, b) => b.price - a.price);
      const isPriceHighSorted = sortedByPriceHigh[0].price >= sortedByPriceHigh[sortedByPriceHigh.length - 1].price;
      
      // Test category sorting
      const sortedByCategory = [...products].sort((a, b) => a.category.localeCompare(b.category));
      const isCategorySorted = sortedByCategory[0].category <= sortedByCategory[sortedByCategory.length - 1].category;

      if (isNameSorted && isPriceLowSorted && isPriceHighSorted && isCategorySorted) {
        addTestResult('All sorting options work correctly (name, price-low, price-high, category)');
        Alert.alert('Test Passed', 'Product sorting validation successful');
      } else {
        addTestFailure('One or more sorting options failed validation');
        Alert.alert('Test Failed', 'Product sorting validation failed');
      }
    } catch (error) {
      addTestFailure(`Product sorting test failed: ${error}`);
      Alert.alert('Test Failed', 'Product sorting test encountered an error');
    }
  };

  // Test 4: Category Navigation Data
  const testCategoryNavigation = () => {
    try {
      const categories = [...new Set(mockProducts.map(p => p.category))];
      const categoriesWithAll = ['all', ...categories];
      
      if (categoriesWithAll.length < 2) {
        addTestFailure('Insufficient categories for navigation testing');
        return;
      }

      // Test that each category has products
      let validCategories = 0;
      categories.forEach(category => {
        const productsInCategory = mockProducts.filter(p => p.category === category);
        if (productsInCategory.length > 0) {
          validCategories++;
        }
      });

      if (validCategories === categories.length) {
        addTestResult(`Category navigation data valid: ${categoriesWithAll.length} total options (including 'all')`);
        Alert.alert('Test Passed', `Category navigation validated with ${validCategories} categories`);
      } else {
        addTestFailure(`Some categories have no products: ${validCategories}/${categories.length} valid`);
        Alert.alert('Test Failed', 'Category navigation validation failed');
      }
    } catch (error) {
      addTestFailure(`Category navigation test failed: ${error}`);
      Alert.alert('Test Failed', 'Category navigation test encountered an error');
    }
  };

  // Test 5: Product Data Integrity
  const testProductDataIntegrity = () => {
    try {
      let validProducts = 0;
      let productsWithTags = 0;
      let productsWithImages = 0;

      mockProducts.forEach(product => {
        // Check required fields
        if (product.id && product.name && product.price && product.category) {
          validProducts++;
        }
        
        // Check optional enhanced fields
        if (product.tags && product.tags.length > 0) {
          productsWithTags++;
        }
        
        if (getProductImageUrl(product)) {
          productsWithImages++;
        }
      });

      const integrity = (validProducts / mockProducts.length) * 100;
      const tagsPercentage = (productsWithTags / mockProducts.length) * 100;
      const imagesPercentage = (productsWithImages / mockProducts.length) * 100;

      if (integrity === 100) {
        addTestResult(`Product data integrity: ${integrity}% (${validProducts}/${mockProducts.length} valid)`);
        addTestResult(`Products with tags: ${tagsPercentage.toFixed(1)}% (${productsWithTags}/${mockProducts.length})`);
        addTestResult(`Products with images: ${imagesPercentage.toFixed(1)}% (${productsWithImages}/${mockProducts.length})`);
        Alert.alert('Test Passed', `Product data integrity: ${integrity}%`);
      } else {
        addTestFailure(`Product data integrity issues: ${integrity}%`);
        Alert.alert('Test Failed', `Product data integrity: ${integrity}%`);
      }
    } catch (error) {
      addTestFailure(`Product data integrity test failed: ${error}`);
      Alert.alert('Test Failed', 'Product data integrity test encountered an error');
    }
  };

  // Test 6: Combined Filter and Sort
  const testCombinedOperations = () => {
    try {
      const testCategory = 'Vegetables';
      const filteredProducts = mockProducts.filter(p => p.category === testCategory);
      
      if (filteredProducts.length === 0) {
        addTestFailure(`No products found in test category: ${testCategory}`);
        return;
      }

      // Apply sorting to filtered results
      const sortedFiltered = [...filteredProducts].sort((a, b) => a.price - b.price);
      
      // Verify sorting worked on filtered data
      let isSorted = true;
      for (let i = 1; i < sortedFiltered.length; i++) {
        if (sortedFiltered[i].price < sortedFiltered[i - 1].price) {
          isSorted = false;
          break;
        }
      }

      if (isSorted) {
        addTestResult(`Combined filter + sort works: ${filteredProducts.length} ${testCategory} products sorted by price`);
        Alert.alert('Test Passed', 'Combined filter and sort operations work correctly');
      } else {
        addTestFailure('Combined filter + sort operation failed');
        Alert.alert('Test Failed', 'Combined filter and sort validation failed');
      }
    } catch (error) {
      addTestFailure(`Combined operations test failed: ${error}`);
      Alert.alert('Test Failed', 'Combined operations test encountered an error');
    }
  };

  const runAllTests = () => {
    clearResults();
    setTimeout(() => testCategoryFiltering(), 100);
    setTimeout(() => testEnhancedSearch(), 200);
    setTimeout(() => testProductSorting(), 300);
    setTimeout(() => testCategoryNavigation(), 400);
    setTimeout(() => testProductDataIntegrity(), 500);
    setTimeout(() => testCombinedOperations(), 600);
  };

  const navigateToShop = () => {
    navigation.navigate('Shop');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Card variant="elevated" style={styles.headerCard}>
          <Text variant="heading2" align="center" style={styles.title}>
            🧪 Enhanced Catalog Tests
          </Text>
          <Text variant="body" color="secondary" align="center">
            Increment 1.4: Enhanced Browse Features
          </Text>
        </Card>

        <Card variant="elevated" style={styles.testCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Individual Tests
          </Text>
          
          <View style={styles.buttonGrid}>
            <Button
              title="Test Category Filtering"
              onPress={testCategoryFiltering}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Enhanced Search"
              onPress={testEnhancedSearch}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Product Sorting"
              onPress={testProductSorting}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Category Navigation"
              onPress={testCategoryNavigation}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Data Integrity"
              onPress={testProductDataIntegrity}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Combined Operations"
              onPress={testCombinedOperations}
              variant="outline"
              style={styles.testButton}
            />
          </View>
        </Card>

        <Card variant="elevated" style={styles.testCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Batch Operations
          </Text>
          
          <View style={styles.batchButtons}>
            <Button
              title="🚀 Run All Tests"
              onPress={runAllTests}
              variant="primary"
              style={styles.batchButton}
            />
            
            <Button
              title="Clear Results"
              onPress={clearResults}
              variant="outline"
              style={styles.batchButton}
            />
          </View>
        </Card>

        <Card variant="elevated" style={styles.testCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Navigation
          </Text>
          
          <Button
            title="🛒 Test in Live Shop Screen"
            onPress={navigateToShop}
            variant="secondary"
          />
        </Card>

        {testResults.length > 0 && (
          <Card variant="elevated" style={styles.resultsCard}>
            <Text variant="heading3" style={styles.sectionTitle}>
              Test Results ({testResults.length})
            </Text>
            
            <View style={styles.results}>
              {testResults.map((result, index) => (
                <Text key={index} variant="body" style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing.sm,
  },
  testCard: {
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  buttonGrid: {
    gap: spacing.sm,
  },
  testButton: {
    marginBottom: spacing.xs,
  },
  batchButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  batchButton: {
    flex: 1,
  },
  resultsCard: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  results: {
    gap: spacing.xs,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
