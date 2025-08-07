import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Card } from '../components';
import { spacing, colors, borderRadius } from '../utils/theme';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TestStackParamList } from '../navigation/TestStackNavigator';

type NavigationProp = StackNavigationProp<TestStackParamList>;

interface TestCategory {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  screenName: keyof TestStackParamList;
  color: string;
  tests?: Array<{
    name: string;
    screen: keyof TestStackParamList;
  }>;
}

const testCategories: TestCategory[] = [
  {
    id: 'basic',
    title: 'Basic Tests',
    description: 'Core functionality and data layer tests',
    icon: 'flask-outline',
    screenName: 'Test',
    color: '#3B82F6',
  },
  {
    id: 'catalog',
    title: 'Product Catalog',
    description: 'Product listing and basic catalog features',
    icon: 'grid-outline',
    screenName: 'CatalogTest',
    color: '#8B5CF6',
  },
  {
    id: 'data',
    title: 'Data Layer',
    description: 'Data management and persistence tests',
    icon: 'server-outline',
    screenName: 'DataTest',
    color: '#06B6D4',
  },
  {
    id: 'enhanced-catalog',
    title: 'Enhanced Catalog',
    description: 'Advanced browsing, filtering, and search features',
    icon: 'layers-outline',
    screenName: 'EnhancedCatalogTest',
    color: '#10B981',
  },
  {
    id: 'cart',
    title: 'Shopping Cart',
    description: 'Cart functionality, quantity management, and persistence',
    icon: 'basket-outline',
    screenName: 'CartFunctionalityTest',
    color: '#F59E0B',
  },
  {
    id: 'stock',
    title: 'Stock Validation',
    description: 'Stock limits, pre-order validation, and inventory management',
    icon: 'checkmark-circle-outline',
    screenName: 'StockValidationTest',
    color: '#EF4444',
  },
  {
    id: 'order',
    title: 'Order Placement',
    description: 'Checkout flow, order submission, and React Query integration',
    icon: 'receipt-outline',
    screenName: 'OrderPlacementTest',
    color: '#8B5CF6',
  },
  {
    id: 'enhanced-checkout',
    title: 'Enhanced Checkout',
    description: 'Advanced validation, date/time picker, and order confirmation',
    icon: 'card-outline',
    screenName: 'EnhancedCheckoutTest',
    color: '#F59E0B',
  },
  {
    id: 'automated-tests',
    title: 'Automated Tests',
    description: 'In-app automated test runner with pass/fail validation',
    icon: 'flash-outline',
    screenName: 'AutomatedTest',
    color: '#8B5CF6',
  },
  {
    id: 'profile-management',
    title: 'Profile Management',
    description: 'User profile editing, validation, and order history',
    icon: 'person-outline',
    screenName: 'ProfileManagementTest',
    color: '#EC4899',
  },
  {
    id: 'staff-qr-scanner',
    title: 'Staff QR Scanner',
    description: 'QR code scanning, order verification, and pickup completion',
    icon: 'qr-code-outline',
    screenName: 'StaffQRScannerTest',
    color: '#10B981',
  },
  {
    id: 'hybrid-auth',
    title: 'Hybrid Auth System',
    description: 'React Query + AuthContext hybrid authentication testing',
    icon: 'shield-checkmark-outline',
    screenName: 'HybridAuthTest',
    color: '#DC2626',
  },
  {
    id: 'backend-integration',
    title: 'Backend Integration',
    description: 'Supabase Auth and Database integration testing',
    icon: 'cloud-outline',
    screenName: 'BackendIntegrationTest',
    color: '#7C3AED',
    tests: [
      { name: 'Product Debug Test', screen: 'ProductDebugTest' },
      { name: 'Real-time Integration Test', screen: 'RealtimeTest' },
      { name: 'Broadcast Architecture Test', screen: 'BroadcastArchitectureTest' },
      { name: 'Simple Broadcast Test', screen: 'SimpleBroadcastTest' },
      { name: 'Backend Integration Test', screen: 'BackendIntegrationTest' },
    ],
  },
  {
    id: 'admin-order',
    title: 'Admin Order Management',
    description: 'Order filtering, bulk updates, statistics, and admin operations',
    icon: 'business-outline',
    screenName: 'AdminOrderTest',
    color: '#7C3AED',
  },
  {
    id: 'product-debug',
    title: 'Product Debug Test',
    description: 'Debug product loading, Supabase connection, and data fetching issues',
    icon: 'bug-outline',
    screenName: 'ProductDebugTest',
    color: '#F59E0B',
  },
];

export const TestHubScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleCategoryPress = (category: TestCategory) => {
    if (category.tests && category.tests.length > 0) {
      // If category has sub-tests, toggle expansion instead of navigating
      setExpandedCategory(expandedCategory === category.id ? null : category.id);
    } else {
      // Navigate directly for categories without sub-tests
      setSelectedCategory(category.id);
      setTimeout(() => {
        navigation.navigate(category.screenName);
        setSelectedCategory(null);
      }, 150);
    }
  };

  const handleSubTestPress = (screenName: keyof TestStackParamList) => {
    navigation.navigate(screenName);
  };

  const renderTestCategory = (category: TestCategory) => {
    const isSelected = selectedCategory === category.id;
    const isExpanded = expandedCategory === category.id;
    const hasSubTests = category.tests && category.tests.length > 0;
    
    return (
      <View key={category.id}>
        <TouchableOpacity
          onPress={() => handleCategoryPress(category)}
          activeOpacity={0.7}
        >
          <Card 
            variant="elevated" 
            style={isSelected ? {...styles.categoryCard, ...styles.selectedCard} : styles.categoryCard}
          >
            <View style={styles.categoryHeader}>
              <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                <Ionicons 
                  name={category.icon} 
                  size={24} 
                  color={category.color} 
                />
              </View>
              <View style={styles.categoryInfo}>
                <Text variant="heading3" style={styles.categoryTitle}>
                  {category.title}
                </Text>
                <Text variant="body" color="secondary" style={styles.categoryDescription}>
                  {category.description}
                </Text>
              </View>
              <Ionicons 
                name={hasSubTests ? (isExpanded ? "chevron-down" : "chevron-forward") : "chevron-forward"} 
                size={20} 
                color="#9CA3AF" 
              />
            </View>
          </Card>
        </TouchableOpacity>
        
        {/* Render sub-tests if expanded */}
        {isExpanded && hasSubTests && (
          <View style={styles.subTestsContainer}>
            {category.tests!.map((test, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSubTestPress(test.screen)}
                style={styles.subTestItem}
                activeOpacity={0.7}
              >
                <View style={styles.subTestContent}>
                  <Ionicons name="play-circle-outline" size={16} color={category.color} />
                  <Text style={[styles.subTestText, { color: category.color }] as any}>
                    {test.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="heading1" style={styles.title}>
            Test Hub
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Comprehensive testing suite for all app features
          </Text>
        </View>

        <View style={styles.categoriesContainer}>
          <Text variant="heading2" style={styles.sectionTitle}>
            Test Categories
          </Text>
          <Text variant="body" color="secondary" style={styles.sectionDescription}>
            Select a category to run specific tests and validate functionality
          </Text>

          <View style={styles.categoriesList}>
            {testCategories.map(renderTestCategory)}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Card variant="outlined" style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text variant="heading3" style={styles.infoTitle}>
                About Testing
              </Text>
            </View>
            <Text variant="body" color="secondary" style={styles.infoText}>
              Each test category contains comprehensive validation for specific app features. 
              Tests include both automated checks and manual verification steps to ensure 
              quality and reliability across all functionality.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    lineHeight: 22,
  },
  categoriesContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  categoriesList: {
    gap: spacing.md,
  },
  categoryCard: {
    padding: spacing.lg,
    marginBottom: 0,
  },
  selectedCard: {
    backgroundColor: '#F3F4F6',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    marginBottom: spacing.xs,
  },
  categoryDescription: {
    lineHeight: 18,
  },
  infoSection: {
    marginBottom: spacing.xl,
  },
  infoCard: {
    padding: spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoTitle: {
    marginLeft: spacing.sm,
  },
  infoText: {
    lineHeight: 20,
  },
  subTestsContainer: {
    marginLeft: spacing.lg,
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  subTestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
  },
  subTestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subTestText: {
    marginLeft: spacing.sm,
    fontSize: 14,
    fontWeight: '500',
  },
});
