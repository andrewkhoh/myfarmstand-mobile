import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Screen, Text, Button, Card, Loading } from '../../components';
import { useProducts, useCategories, useProduct, useProductSearch } from '../../hooks/useProducts';
import { ProductService } from '../../services/productService';
import { spacing, colors } from '../../utils/theme';

export const DataLayerTestScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Test hooks - using React Query API
  const { data: products, isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
  const { data: categories, isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useCategories();
  const { data: singleProduct, isLoading: productLoading, refetch: refetchProduct } = useProduct('1');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading: searchLoading } = useProductSearch(searchQuery);

  const addTestResult = (result: string, success: boolean = true) => {
    const icon = success ? '✅' : '❌';
    setTestResults(prev => [...prev, `${icon} ${result}`]);
  };

  // Search functions to match old API
  const searchProducts = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const testProductService = async () => {
    addTestResult('Testing ProductService.getProducts()...');
    try {
      const response = await ProductService.getProducts();
      if (response.success && response.data.length > 0) {
        addTestResult(`ProductService.getProducts(): ${response.data.length} products loaded`);
      } else {
        addTestResult(`ProductService.getProducts() failed: ${response.error}`, false);
      }
    } catch (error) {
      addTestResult(`ProductService.getProducts() error: ${error}`, false);
    }
  };

  const testCategoryService = async () => {
    addTestResult('Testing ProductService.getCategories()...');
    try {
      const response = await ProductService.getCategories();
      if (response.success && response.data.length > 0) {
        addTestResult(`ProductService.getCategories(): ${response.data.length} categories loaded`);
      } else {
        addTestResult(`ProductService.getCategories() failed: ${response.error}`, false);
      }
    } catch (error) {
      addTestResult(`ProductService.getCategories() error: ${error}`, false);
    }
  };

  const testSingleProductService = async () => {
    addTestResult('Testing ProductService.getProductById()...');
    try {
      const response = await ProductService.getProductById('1');
      if (response.success && response.data.id) {
        addTestResult(`ProductService.getProductById(): Product "${response.data.name}" loaded`);
      } else {
        addTestResult(`ProductService.getProductById() failed: ${response.error}`, false);
      }
    } catch (error) {
      addTestResult(`ProductService.getProductById() error: ${error}`, false);
    }
  };

  const testSearchService = async () => {
    addTestResult('Testing ProductService.searchProducts()...');
    try {
      const response = await ProductService.searchProducts('tomato');
      if (response.success) {
        addTestResult(`ProductService.searchProducts(): ${response.data.length} results for "tomato"`);
      } else {
        addTestResult(`ProductService.searchProducts() failed: ${response.error}`, false);
      }
    } catch (error) {
      addTestResult(`ProductService.searchProducts() error: ${error}`, false);
    }
  };

  const testPaginationService = async () => {
    addTestResult('Testing ProductService.getProductsPaginated()...');
    try {
      const response = await ProductService.getProductsPaginated(1, 5);
      if (response.success && response.data.data.length > 0) {
        addTestResult(`ProductService.getProductsPaginated(): ${response.data.data.length} products, total: ${response.data.total}`);
      } else {
        addTestResult(`ProductService.getProductsPaginated() failed: ${response.error}`, false);
      }
    } catch (error) {
      addTestResult(`ProductService.getProductsPaginated() error: ${error}`, false);
    }
  };

  const testCategoryProductsService = async () => {
    addTestResult('Testing ProductService.getProductsByCategory()...');
    try {
      const response = await ProductService.getProductsByCategory('1'); // Vegetables
      if (response.success) {
        addTestResult(`ProductService.getProductsByCategory(): ${response.data.length} vegetables found`);
      } else {
        addTestResult(`ProductService.getProductsByCategory() failed: ${response.error}`, false);
      }
    } catch (error) {
      addTestResult(`ProductService.getProductsByCategory() error: ${error}`, false);
    }
  };

  const testHooks = () => {
    addTestResult('Testing React Hooks...');
    
    // Test useProducts hook
    if (products && products.length > 0) {
      addTestResult(`useProducts hook: ${products.length} products loaded`);
    } else if (productsError) {
      addTestResult(`useProducts hook error: ${productsError.message}`, false);
    } else if (productsLoading) {
      addTestResult('useProducts hook: Loading...');
    } else {
      addTestResult('useProducts hook: No data available', false);
    }

    // Test useCategories hook
    if (categories && categories.length > 0) {
      addTestResult(`useCategories hook: ${categories.length} categories loaded`);
    } else if (categoriesError) {
      addTestResult(`useCategories hook error: ${categoriesError.message}`, false);
    } else if (categoriesLoading) {
      addTestResult('useCategories hook: Loading...');
    } else {
      addTestResult('useCategories hook: No data available', false);
    }

    // Test useProduct hook
    if (singleProduct) {
      addTestResult(`useProduct hook: Product "${singleProduct.name}" loaded`);
    } else {
      addTestResult('useProduct hook: No product loaded', false);
    }
  };

  const testDirectSearch = async () => {
    addTestResult('Testing direct ProductService.searchProducts()...');
    
    try {
      // Test search for 'apple' - should find Honeycrisp Apples
      const appleResults = await ProductService.searchProducts('apple');
      if (appleResults.success && appleResults.data.length > 0) {
        addTestResult(`Direct search 'apple': ${appleResults.data.length} results`);
        addTestResult(`Found: ${appleResults.data.map(p => p.name).join(', ')}`);
      } else {
        addTestResult(`Direct search 'apple' failed: ${appleResults.error}`, false);
      }
      
      // Test search for 'organic' - should find multiple products
      const organicResults = await ProductService.searchProducts('organic');
      if (organicResults.success && organicResults.data.length > 0) {
        addTestResult(`Direct search 'organic': ${organicResults.data.length} results`);
      } else {
        addTestResult(`Direct search 'organic' failed: ${organicResults.error}`, false);
      }
      
    } catch (error) {
      addTestResult(`Direct search error: ${error}`, false);
    }
  };

  const testSearchHook = async () => {
    addTestResult('Testing useProductSearch hook...');
    
    // First test the current state
    addTestResult(`Current search results: ${searchResults ? searchResults.length : 0}`);
    addTestResult(`Search loading: ${searchLoading}`);
    
    try {
      // Clear any previous search results first
      clearSearch();
      addTestResult('Cleared previous search results');
      
      // Perform search
      addTestResult('Calling searchProducts("apple")...');
      searchProducts('apple');
      
      // Wait a moment for the search to complete
      setTimeout(() => {
        addTestResult(`Search results after 'apple': ${searchResults ? searchResults.length : 0}`);
        if (searchResults && searchResults.length > 0) {
          addTestResult(`First result: ${searchResults[0].name}`);
        }
        
        // Test clearing search
        clearSearch();
        addTestResult('Search cleared');
      }, 1000);
      
    } catch (error) {
      addTestResult(`Search hook error: ${error}`, false);
    }
  };

  const testLoadingStates = () => {
    addTestResult('Testing Loading States...');
    addTestResult(`Products loading: ${productsLoading ? 'Yes' : 'No'}`);
    addTestResult(`Categories loading: ${categoriesLoading ? 'Yes' : 'No'}`);
    addTestResult(`Single product loading: ${productLoading ? 'Yes' : 'No'}`);
    addTestResult(`Search loading: ${searchLoading ? 'Yes' : 'No'}`);
  };

  const testErrorStates = () => {
    addTestResult('Testing Error States...');
    addTestResult(`Products error: ${productsError || 'None'}`);
    addTestResult(`Categories error: ${categoriesError || 'None'}`);
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    addTestResult('🚀 Starting Increment 1.2 Data Layer Tests...');
    
    // Test all service methods
    await testProductService();
    await testCategoryService();
    await testSingleProductService();
    await testSearchService();
    await testDirectSearch();
    await testPaginationService();
    await testCategoryProductsService();
    
    // Test hooks
    testHooks();
    await testSearchHook();
    
    // Test states
    testLoadingStates();
    testErrorStates();
    
    addTestResult('🏁 All Data Layer Tests Complete!');
    setIsRunningTests(false);
    
    Alert.alert('Tests Complete', 'Check the results below for detailed information');
  };

  const clearResults = () => {
    setTestResults([]);
    clearSearch();
  };

  return (
    <Screen scrollable padding>
      <View style={styles.container}>
        <Text variant="heading1" align="center" style={styles.title}>
          🧪 Data Layer Test
        </Text>
        <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
          Increment 1.2: Product Data Layer & API Integration
        </Text>

        {/* Test Controls */}
        <Card variant="elevated" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Test Controls</Text>
          <Button 
            title="Run All Data Layer Tests" 
            onPress={runAllTests}
            disabled={isRunningTests}
          />
          <Button title="Clear Results" variant="outline" onPress={clearResults} />
        </Card>

        {/* Service Layer Tests */}
        <Card variant="elevated" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Service Layer Tests</Text>
          <Button title="Test Product Service" variant="outline" onPress={testProductService} />
          <Button title="Test Category Service" variant="outline" onPress={testCategoryService} />
          <Button title="Test Single Product" variant="outline" onPress={testSingleProductService} />
          <Button title="Test Search Service" variant="outline" onPress={testSearchService} />
          <Button title="Test Direct Search" variant="outline" onPress={testDirectSearch} />
          <Button title="Test Pagination" variant="outline" onPress={testPaginationService} />
          <Button title="Test Category Products" variant="outline" onPress={testCategoryProductsService} />
        </Card>

        {/* Hook Tests */}
        <Card variant="elevated" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>React Hooks Tests</Text>
          <Button title="Test Data Hooks" variant="outline" onPress={testHooks} />
          <Button title="Test Search Hook" variant="outline" onPress={testSearchHook} />
          <Button title="Test Loading States" variant="outline" onPress={testLoadingStates} />
          <Button title="Test Error States" variant="outline" onPress={testErrorStates} />
        </Card>

        {/* Data Refresh Tests */}
        <Card variant="elevated" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Data Refresh Tests</Text>
          <Button title="Refetch Products" variant="outline" onPress={refetchProducts} />
          <Button title="Refetch Categories" variant="outline" onPress={refetchCategories} />
          <Button title="Refetch Single Product" variant="outline" onPress={refetchProduct} />
        </Card>

        {/* Current Data Status */}
        <Card variant="default" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Current Data Status</Text>
          <Text variant="body">Products loaded: {products ? products.length : 0}</Text>
          <Text variant="body">Categories loaded: {categories ? categories.length : 0}</Text>
          <Text variant="body">Single product: {singleProduct?.name || 'None'}</Text>
          <Text variant="body">Search results: {searchResults ? searchResults.length : 0}</Text>
          <Text variant="body">Products loading: {productsLoading ? 'Yes' : 'No'}</Text>
          <Text variant="body">Categories loading: {categoriesLoading ? 'Yes' : 'No'}</Text>
          <Text variant="body">Search loading: {searchLoading ? 'Yes' : 'No'}</Text>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card variant="elevated" style={styles.section}>
            <Text variant="heading3" style={styles.sectionTitle}>Test Results</Text>
            {testResults.map((result, index) => (
              <Text key={index} variant="body" style={styles.result}>
                {result}
              </Text>
            ))}
          </Card>
        )}

        {/* Manual Test Checklist */}
        <Card variant="default" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Manual Test Checklist</Text>
          <Text variant="body">• TypeScript interfaces defined ✓</Text>
          <Text variant="body">• Product service layer created ✓</Text>
          <Text variant="body">• API response types defined ✓</Text>
          <Text variant="body">• React hooks for data fetching ✓</Text>
          <Text variant="body">• Loading states implemented ✓</Text>
          <Text variant="body">• Error handling implemented ✓</Text>
          <Text variant="body">• Mock API with delays ✓</Text>
          <Text variant="body">• Category relationships ✓</Text>
          <Text variant="body">• Search functionality ✓</Text>
          <Text variant="body">• Pagination support ✓</Text>
        </Card>

        {isRunningTests && (
          <Loading overlay message="Running data layer tests..." />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  result: {
    backgroundColor: colors.neutral[50],
    padding: spacing.xs,
    borderRadius: 4,
    marginBottom: spacing.xs,
    fontFamily: 'monospace',
  },
});
