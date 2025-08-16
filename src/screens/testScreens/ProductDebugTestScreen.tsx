import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ProductService } from '../../services/productService';
import { useProducts, useCategories } from '../../hooks/useProducts';
import { supabase } from '../../config/supabase';
import { getProductStock, getProductCategoryId } from '../../utils/typeMappers';

export default function ProductDebugTestScreen() {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Use React Query hooks
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts();
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  const testDirectSupabaseConnection = async () => {
    setLoading(true);
    try {
      // Test all products
      const { data: allData, error: allError } = await supabase
        .from('products')
        .select('*');
      
      // Test available products only
      const { data: availableData, error: availableError } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true);
      
      setDebugInfo(`Direct Supabase Query Results:

ALL PRODUCTS:
${allError ? `Error: ${allError.message}` : `Success: Found ${allData?.length || 0} total products`}

AVAILABLE PRODUCTS ONLY:
${availableError ? `Error: ${availableError.message}` : `Success: Found ${availableData?.length || 0} available products`}

First few products with availability status:
${allData ? allData.slice(0, 5).map(p => `${p.name}: is_available = ${p.is_available}`).join('\n') : 'No data'}`);
    } catch (err) {
      setDebugInfo(`Direct query error: ${err}`);
    }
    setLoading(false);
  };

  const testProductService = async () => {
    setLoading(true);
    try {
      const response = await ProductService.getProducts();
      setDebugInfo(`ProductService.getProducts() Result:
Success: ${response.success}
Error: ${response.error || 'None'}
Data count: ${response.data?.length || 0}
${response.data ? JSON.stringify(response.data.slice(0, 2), null, 2) : 'No data'}`);
    } catch (err) {
      setDebugInfo(`ProductService error: ${err}`);
    }
    setLoading(false);
  };

  const testCategoriesService = async () => {
    setLoading(true);
    try {
      const response = await ProductService.getCategories();
      setDebugInfo(`ProductService.getCategories() Result:
Success: ${response.success}
Error: ${response.error || 'None'}
Data count: ${response.data?.length || 0}
${response.data ? JSON.stringify(response.data, null, 2) : 'No data'}`);
    } catch (err) {
      setDebugInfo(`Categories service error: ${err}`);
    }
    setLoading(false);
  };

  const testRealTimeUpdates = async () => {
    setLoading(true);
    try {
      setDebugInfo(`Testing real-time updates...

1. Setting up Supabase subscription
2. Listening for product changes
3. Will show updates when database changes occur

Try updating a product in your Supabase dashboard to see real-time sync!`);
      
      // Set up a temporary subscription to test real-time updates
      const subscription = supabase
        .channel('test-products-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products'
          },
          (payload) => {
            setDebugInfo(prev => prev + `

🔄 REAL-TIME UPDATE DETECTED:
Event: ${payload.eventType}
Table: ${payload.table}
New: ${JSON.stringify(payload.new, null, 2)}
Old: ${JSON.stringify(payload.old, null, 2)}`);
          }
        )
        .subscribe();

      // Clean up after 30 seconds
      setTimeout(() => {
        subscription.unsubscribe();
        setDebugInfo(prev => prev + '\n\n✅ Real-time test completed. Subscription cleaned up.');
      }, 30000);
      
    } catch (err) {
      setDebugInfo(`Real-time test error: ${err}`);
    }
    setLoading(false);
  };

  const testDatabaseIntegrity = async () => {
    setLoading(true);
    try {
      // Test 1: Check for orphaned products (products without valid categories)
      const { data: products } = await supabase.from('products').select('id, name, category');
      const { data: categories } = await supabase.from('categories').select('id, name');
      
      const categoryIds = new Set(categories?.map(cat => cat.id) || []);
      const orphanedProducts = products?.filter(product => !categoryIds.has(product.category)) || [];
      
      // Test 2: Check for missing required fields
      const productsWithMissingFields = products?.filter(product => 
        !product.name || !product.category
      ) || [];
      
      // Test 3: Check category-product relationships
      const categoryStats = categories?.map(category => {
        const productCount = products?.filter(product => product.category === category.id).length || 0;
        return { categoryName: category.name, productCount };
      }) || [];
      
      setDebugInfo(`Database Integrity Check Results:

📊 SUMMARY:
- Total Products: ${products?.length || 0}
- Total Categories: ${categories?.length || 0}
- Orphaned Products: ${orphanedProducts.length}
- Products with Missing Fields: ${productsWithMissingFields.length}

🏷️ CATEGORY BREAKDOWN:
${categoryStats.map(stat => `- ${stat.categoryName}: ${stat.productCount} products`).join('\n')}

${orphanedProducts.length > 0 ? `⚠️ ORPHANED PRODUCTS:
${orphanedProducts.map(p => `- ${p.name} (category: ${p.category})`).join('\n')}` : '✅ No orphaned products found'}

${productsWithMissingFields.length > 0 ? `⚠️ PRODUCTS WITH MISSING FIELDS:
${productsWithMissingFields.map(p => `- ${p.name || 'UNNAMED'}`).join('\n')}` : '✅ All products have required fields'}`);
      
    } catch (err) {
      setDebugInfo(`Database integrity test error: ${err}`);
    }
    setLoading(false);
  };

  const testPerformanceMetrics = async () => {
    setLoading(true);
    try {
      const startTime = Date.now();
      
      // Test query performance
      const productQueryStart = Date.now();
      const { data: products } = await supabase.from('products').select('*');
      const productQueryTime = Date.now() - productQueryStart;
      
      const categoryQueryStart = Date.now();
      const { data: categories } = await supabase.from('categories').select('*');
      const categoryQueryTime = Date.now() - categoryQueryStart;
      
      const serviceQueryStart = Date.now();
      const serviceResponse = await ProductService.getProducts();
      const serviceQueryTime = Date.now() - serviceQueryStart;
      
      const totalTime = Date.now() - startTime;
      
      setDebugInfo(`Performance Metrics:

⏱️ QUERY TIMES:
- Direct Products Query: ${productQueryTime}ms
- Direct Categories Query: ${categoryQueryTime}ms
- ProductService.getProducts(): ${serviceQueryTime}ms
- Total Test Time: ${totalTime}ms

📊 DATA SIZES:
- Products Retrieved: ${products?.length || 0}
- Categories Retrieved: ${categories?.length || 0}
- Service Products: ${serviceResponse.data?.length || 0}

🚀 PERFORMANCE ANALYSIS:
${productQueryTime < 100 ? '✅' : '⚠️'} Products query: ${productQueryTime < 100 ? 'Fast' : 'Slow'} (${productQueryTime}ms)
${categoryQueryTime < 100 ? '✅' : '⚠️'} Categories query: ${categoryQueryTime < 100 ? 'Fast' : 'Slow'} (${categoryQueryTime}ms)
${serviceQueryTime < 200 ? '✅' : '⚠️'} Service layer: ${serviceQueryTime < 200 ? 'Fast' : 'Slow'} (${serviceQueryTime}ms)`);
      
    } catch (err) {
      setDebugInfo(`Performance test error: ${err}`);
    }
    setLoading(false);
  };

  const checkEnvironmentVars = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    setDebugInfo(`Environment Variables:
EXPO_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Missing'}
EXPO_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? 'Set' : 'Missing'}
URL: ${supabaseUrl}
Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'Not found'}`);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Product Debug Test Screen
      </Text>

      {/* React Query Status */}
      <View style={{ marginBottom: 20, padding: 15, backgroundColor: 'white', borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>React Query Status</Text>
        <Text>Products Loading: {productsLoading ? 'Yes' : 'No'}</Text>
        <Text>Products Count: {products?.length || 0}</Text>
        <Text>Products Error: {productsError?.message || 'None'}</Text>
        <Text>Categories Loading: {categoriesLoading ? 'Yes' : 'No'}</Text>
        <Text>Categories Count: {categories?.length || 0}</Text>
        <Text>Categories Error: {categoriesError?.message || 'None'}</Text>
      </View>

      {/* Test Buttons */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={checkEnvironmentVars}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Check Environment Variables
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={testRealTimeUpdates}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🔄 Test Real-Time Updates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#388e3c', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={testDatabaseIntegrity}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🔍 Database Integrity Check
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#ff9800', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={testPerformanceMetrics}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            ⚡ Performance Metrics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#1976d2', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={testDirectSupabaseConnection}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Test Direct Supabase Query
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#f57c00', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={testProductService}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Test ProductService.getProducts()
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#7b1fa2', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={testCategoriesService}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Test ProductService.getCategories()
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug Output */}
      {debugInfo && (
        <View style={{ backgroundColor: '#333', padding: 15, borderRadius: 8, marginBottom: 20 }}>
          <Text style={{ color: 'white', fontSize: 12, fontFamily: 'monospace' }}>
            {debugInfo}
          </Text>
        </View>
      )}

      {/* Current Products Display */}
      {products && products.length > 0 && (
        <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Current Products from React Query
          </Text>
          {products.slice(0, 3).map((product, index) => (
            <View key={product.id} style={{ marginBottom: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}>
              <Text style={{ fontWeight: 'bold' }}>{product.name}</Text>
              <Text>Price: ${product.price}</Text>
              <Text>Stock: {getProductStock(product)}</Text>
              <Text>Category ID: {getProductCategoryId(product)}</Text>
            </View>
          ))}
        </View>
      )}

      {loading && (
        <Text style={{ textAlign: 'center', fontSize: 16, color: '#666' }}>
          Running test...
        </Text>
      )}
    </ScrollView>
  );
}
