import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Card, Button } from '../components';
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
  screenName?: keyof TestStackParamList;
  color: string;
  visible?: boolean;
  type?: 'screen' | 'action';
  action?: () => void;
  tests?: Array<{
    name: string;
    screen: keyof TestStackParamList;
  }>;
}

const runAutomatedTests = () => {
  Alert.alert(
    'Automated Tests',
    'Run automated Jest tests via command line:\n\n• npm test\n• npm run test:services\n• npm run test:hooks\n• npm run test:hooks:race',
    [{ text: 'OK' }]
  );
};

const runBuildOptimization = () => {
  Alert.alert(
    'Build Optimization',
    'Production build commands:\n\n• npm run build\n• npm run lint\n• npm run typecheck\n\nCheck bundle analyzer for size optimization.',
    [{ text: 'OK' }]
  );
};

// Environment detection
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

const testCategories: TestCategory[] = [
  // ✅ ESSENTIAL - Core UI/UX Tests (Always Visible)
  {
    id: 'core-ui',
    title: '✅ Core UI/UX Tests',
    description: 'Essential manual testing for developers and QA',
    icon: 'checkmark-circle-outline',
    color: '#10B981',
    visible: true,
    tests: [
      { name: 'Design System & Components', screen: 'Test' },
      { name: 'Shopping Cart Functionality', screen: 'CartFunctionalityTest' },
      { name: 'Order Placement Flow', screen: 'OrderPlacementTest' },
      { name: 'Enhanced Checkout', screen: 'EnhancedCheckoutTest' },
      { name: 'Stock Validation', screen: 'StockValidationTest' },
    ],
  },
  {
    id: 'staff-workflows',
    title: '👥 Staff & Admin Workflows',
    description: 'Staff and administrative interface testing',
    icon: 'people-outline',
    color: '#8B5CF6',
    visible: true,
    tests: [
      { name: 'Staff QR Scanner', screen: 'StaffQRScannerTest' },
      { name: 'Admin Order Management', screen: 'AdminOrderTest' },
      { name: 'Profile Management', screen: 'ProfileManagementTest' },
      { name: 'Hybrid Auth System', screen: 'HybridAuthTest' },
    ],
  },
  // 🔧 DEVELOPMENT - Debug Tools (Dev Environment Only)
  {
    id: 'development-tools',
    title: '🔧 Development Tools',
    description: 'Debug tools and development utilities',
    icon: 'construct-outline',
    color: '#F59E0B',
    visible: isDevelopment,
    tests: [
      { name: 'Product Debug Test', screen: 'ProductDebugTest' },
      { name: 'Real-time Integration', screen: 'RealtimeTest' },
      { name: 'Broadcast Architecture', screen: 'BroadcastArchitectureTest' },
      { name: 'Security Broadcast', screen: 'SecurityBroadcastTest' },
      { name: 'Atomic Operations', screen: 'AtomicOperationsTest' },
      { name: 'Backend Integration', screen: 'BackendIntegrationTest' },
    ],
  },
  {
    id: 'database-tools',
    title: '🗄️ Database & RPC Tools',
    description: 'Database inspection and RPC function testing',
    icon: 'server-outline',
    color: '#06B6D4',
    visible: isDevelopment,
    tests: [
      { name: 'Database Schema Inspector', screen: 'SchemaInspector' },
      { name: 'Cart RPC Functions', screen: 'CartRPCTest' },
      { name: 'Atomic Order Submission', screen: 'AtomicOrderTest' },
      { name: 'Simple Stock Validation', screen: 'SimpleStockValidationTest' },
    ],
  },
  // ⚡ AUTOMATED - Run via Jest
  {
    id: 'automated-tests',
    title: '⚡ Automated Tests',
    description: 'Run comprehensive Jest test suites via command line',
    icon: 'flash-outline',
    color: '#DC2626',
    visible: true,
    type: 'action',
    action: runAutomatedTests,
  },
  {
    id: 'build-optimization',
    title: '📦 Build & Optimization',
    description: 'Production build optimization and performance analysis',
    icon: 'cube-outline',
    color: '#7C3AED',
    visible: isDevelopment,
    type: 'action',
    action: runBuildOptimization,
  },
];

export const TestHubScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleCategoryPress = (category: TestCategory) => {
    if (category.type === 'action' && category.action) {
      // Execute action for action-type categories
      category.action();
    } else if (category.tests && category.tests.length > 0) {
      // If category has sub-tests, toggle expansion instead of navigating
      setExpandedCategory(expandedCategory === category.id ? null : category.id);
    } else if (category.screenName) {
      // Navigate directly for categories without sub-tests
      setSelectedCategory(category.id);
      setTimeout(() => {
        navigation.navigate(category.screenName!);
        setSelectedCategory(null);
      }, 150);
    }
  };

  const handleSubTestPress = (screenName: keyof TestStackParamList) => {
    navigation.navigate(screenName);
  };

  // Filter categories based on visibility
  const visibleCategories = testCategories.filter(category => category.visible !== false);

  const renderTestCategory = (category: TestCategory) => {
    const isSelected = selectedCategory === category.id;
    const isExpanded = expandedCategory === category.id;
    const hasSubTests = category.tests && category.tests.length > 0;
    const isAction = category.type === 'action';
    
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
                {!isDevelopment && category.visible === isDevelopment && (
                  <Text variant="caption" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                    Development only
                  </Text>
                )}
              </View>
              <Ionicons 
                name={
                  isAction 
                    ? "play-outline" 
                    : hasSubTests 
                      ? (isExpanded ? "chevron-down" : "chevron-forward") 
                      : "chevron-forward"
                } 
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
            🧪 Test Hub
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Organized testing suite with smart environment detection
          </Text>
          {isDevelopment && (
            <View style={styles.environmentBadge}>
              <Text style={styles.environmentText}>🔧 Development Mode</Text>
            </View>
          )}
        </View>

        <View style={styles.categoriesContainer}>
          <Text variant="heading2" style={styles.sectionTitle}>
            Test Categories
          </Text>
          <Text variant="body" color="secondary" style={styles.sectionDescription}>
            Organized by purpose: Core UI/UX tests, Staff workflows, and Development tools
          </Text>

          <View style={styles.categoriesList}>
            {visibleCategories.map(renderTestCategory)}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Card variant="outlined" style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text variant="heading3" style={styles.infoTitle}>
                Smart Test Organization
              </Text>
            </View>
            <Text variant="body" color="secondary" style={styles.infoText}>
              ✅ <Text style={{ fontWeight: 'bold' }}>Core UI/UX</Text>: Essential manual tests always available{'\n'}
              👥 <Text style={{ fontWeight: 'bold' }}>Staff Workflows</Text>: Administrative interface testing{'\n'}
              🔧 <Text style={{ fontWeight: 'bold' }}>Development Tools</Text>: Debug utilities (dev environment only){'\n'}
              ⚡ <Text style={{ fontWeight: 'bold' }}>Automated Tests</Text>: Run Jest test suites via command line
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
  environmentBadge: {
    backgroundColor: '#F59E0B20',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  environmentText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
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
