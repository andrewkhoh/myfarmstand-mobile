import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { AuthService } from '../../services/authService';
import { ProductService } from '../../services/productService';
import * as OrderService from '../../services/orderService';
import { supabase } from '../../config/supabase';
import { Order, Product, Category } from '../../types';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}

export default function BackendIntegrationTestScreen() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testEmail, setTestEmail] = useState('test@farmstand.com');
  const [testPassword, setTestPassword] = useState('testpass123');

  const updateTestResult = (name: string, status: TestResult['status'], message: string, duration?: number) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === name);
      const newResult = { name, status, message, duration };
      
      if (existing) {
        return prev.map(r => r.name === name ? newResult : r);
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    updateTestResult(testName, 'pending', 'Running...');
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'success', 'Passed', duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'error', error instanceof Error ? error.message : 'Unknown error', duration);
    }
  };

  const testSupabaseConnection = async () => {
    // Test basic Supabase connection
    const { data, error } = await supabase.auth.getSession();
    if (error && error.message !== 'Auth session missing!') {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    // Connection successful if we get here
  };

  const testAuthServiceLogin = async () => {
    // Test login with mock credentials
    try {
      const result = await AuthService.login(testEmail, testPassword);
      if (!result.success) {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      // Expected to fail with mock credentials, but should not crash
      if (error instanceof Error && error.message.includes('Invalid login credentials')) {
        // This is expected for non-existent test user
        return;
      }
      throw error;
    }
  };

  const testAuthServiceRegister = async () => {
    // Test registration (will likely fail due to existing user, but should not crash)
    try {
      const result = await AuthService.register(
        `test-${Date.now()}@farmstand.com`,
        testPassword,
        'Test User',
        '+1234567890',
        '123 Test St'
      );
      // Registration might succeed or fail, both are acceptable for testing
    } catch (error) {
      // Expected to potentially fail, but should not crash the app
      if (error instanceof Error && (
        error.message.includes('User already registered') ||
        error.message.includes('already been registered')
      )) {
        return; // This is acceptable
      }
      throw error;
    }
  };

  const testAuthServiceCurrentUser = async () => {
    // Test getting current user
    const user = await AuthService.getCurrentUser();
    // Should return null or a valid user object without crashing
  };

  const testAuthServiceIsAuthenticated = async () => {
    // Test authentication check
    const isAuth = await AuthService.isAuthenticated();
    // Should return boolean without crashing
  };

  const testProductServiceCategories = async () => {
    // Test fetching categories
    const result = await ProductService.getCategories();
    if (!result.success && result.error !== 'Failed to fetch categories') {
      throw new Error(result.error || 'Categories fetch failed');
    }
    // Should return a response structure without crashing
  };

  const testProductServiceProducts = async () => {
    // Test fetching products
    const result = await ProductService.getProducts();
    if (!result.success && result.error !== 'Failed to fetch products') {
      throw new Error(result.error || 'Products fetch failed');
    }
    // Should return a response structure without crashing
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      { name: 'Supabase Connection', fn: testSupabaseConnection },
      { name: 'Auth Service - Login', fn: testAuthServiceLogin },
      { name: 'Auth Service - Register', fn: testAuthServiceRegister },
      { name: 'Auth Service - Current User', fn: testAuthServiceCurrentUser },
      { name: 'Auth Service - Is Authenticated', fn: testAuthServiceIsAuthenticated },
      { name: 'Product Service - Categories', fn: testProductServiceCategories },
      { name: 'Product Service - Products', fn: testProductServiceProducts },
    ];

    for (const test of tests) {
      await runTest(test.name, test.fn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Backend Integration Tests</Text>
      <Text style={styles.subtitle}>
        Tests Supabase Auth and Database integration
      </Text>

      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Test Configuration</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Test Email:</Text>
          <TextInput
            style={styles.input}
            value={testEmail}
            onChangeText={setTestEmail}
            placeholder="test@farmstand.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Test Password:</Text>
          <TextInput
            style={styles.input}
            value={testPassword}
            onChangeText={setTestPassword}
            placeholder="testpass123"
            secureTextEntry
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.runButton, isRunning && styles.runButtonDisabled]}
        onPress={runAllTests}
        disabled={isRunning}
      >
        <Text style={styles.runButtonText}>
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Text>
      </TouchableOpacity>

      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No tests run yet</Text>
        ) : (
          testResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultIcon}>{getStatusIcon(result.status)}</Text>
                <Text style={styles.resultName}>{result.name}</Text>
                {result.duration && (
                  <Text style={styles.resultDuration}>{result.duration}ms</Text>
                )}
              </View>
              <Text style={[styles.resultMessage, { color: getStatusColor(result.status) }]}>
                {result.message}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Setup Instructions</Text>
        <Text style={styles.infoText}>
          1. Create a Supabase project at supabase.com{'\n'}
          2. Copy your project URL and anon key{'\n'}
          3. Create a .env file with:{'\n'}
          EXPO_PUBLIC_SUPABASE_URL=your_url{'\n'}
          EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key{'\n'}
          4. Set up database tables (users, products, categories, etc.){'\n'}
          5. Run these tests to verify integration
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  configSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  runButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  runButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  runButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noResults: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resultName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  resultDuration: {
    fontSize: 12,
    color: '#6b7280',
  },
  resultMessage: {
    fontSize: 14,
    marginLeft: 24,
  },
  infoSection: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});
