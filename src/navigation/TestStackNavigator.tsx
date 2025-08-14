import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  TestHubScreen,
  TestScreen,
  ProductCatalogTestScreen,
  DataLayerTestScreen,
  EnhancedCatalogTestScreen,
  CartFunctionalityTestScreen,
  StockValidationTestScreen,
  OrderPlacementTestScreen,
  EnhancedCheckoutTestScreen,
  ProfileManagementTestScreen,
  StaffQRScannerTestScreen,
  HybridAuthTestScreen,
  AdminOrderTestScreen,
  ProductDebugTestScreen,
  AutomatedTestRunner,
  RealtimeTestScreen,
  BroadcastArchitectureTestScreen,
  SimpleBroadcastTest,
  CartMigrationTestScreen,
  SecurityBroadcastTestScreen, // ← ADD THIS LINE
} from '../screens';
import AtomicOperationsTestScreen from '../screens/testScreens/AtomicOperationsTestScreen';
import BackendIntegrationTestScreen from '../screens/testScreens/BackendIntegrationTestScreen';
import CartRPCTest from '../tests/CartRPCTest';
import AtomicOrderTest from '../tests/AtomicOrderTest';
import SchemaInspector from '../tests/SchemaInspector';
import SimpleStockValidationTest from '../tests/SimpleStockValidationTest';

export type TestStackParamList = {
  TestHub: undefined;
  Test: undefined;
  CatalogTest: undefined;
  DataTest: undefined;
  EnhancedCatalogTest: undefined;
  CartFunctionalityTest: undefined;
  StockValidationTest: undefined;
  OrderPlacementTest: undefined;
  EnhancedCheckoutTest: undefined;
  ProfileManagementTest: undefined;
  StaffQRScannerTest: undefined;
  HybridAuthTest: undefined;
  AdminOrderTest: undefined;
  ProductDebugTest: undefined;
  RealtimeTest: undefined;
  BroadcastArchitectureTest: undefined;
  SimpleBroadcastTest: undefined;
  SecurityBroadcastTest: undefined;
  AutomatedTest: undefined;
  BackendIntegrationTest: undefined;
  CartRPCTest: undefined;
  AtomicOrderTest: undefined;
  SchemaInspector: undefined;
  SimpleStockValidationTest: undefined;
  CartMigrationTest: undefined;
  AtomicOperationsTest: undefined;
};

const Stack = createStackNavigator<TestStackParamList>();

export const TestStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="TestHub"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#3B82F6',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="TestHub" 
        component={TestHubScreen}
        options={{ title: 'Test Hub' }}
      />
      <Stack.Screen 
        name="Test" 
        component={TestScreen}
        options={{ title: 'Basic Tests' }}
      />
      <Stack.Screen 
        name="CatalogTest" 
        component={ProductCatalogTestScreen}
        options={{ title: 'Product Catalog Tests' }}
      />
      <Stack.Screen 
        name="DataTest" 
        component={DataLayerTestScreen}
        options={{ title: 'Data Layer Tests' }}
      />
      <Stack.Screen 
        name="EnhancedCatalogTest" 
        component={EnhancedCatalogTestScreen}
        options={{ title: 'Enhanced Catalog Tests' }}
      />
      <Stack.Screen 
        name="CartFunctionalityTest" 
        component={CartFunctionalityTestScreen}
        options={{ title: 'Cart Functionality Tests' }}
      />
      <Stack.Screen 
        name="StockValidationTest" 
        component={StockValidationTestScreen}
        options={{
          title: 'Stock Validation Test',
          headerBackTitle: 'Tests',
        }}
      />
      <Stack.Screen 
        name="OrderPlacementTest" 
        component={OrderPlacementTestScreen}
        options={{
          title: 'Order Placement Test',
          headerBackTitle: 'Tests',
        }}
      />
      <Stack.Screen 
        name="EnhancedCheckoutTest" 
        component={EnhancedCheckoutTestScreen}
        options={{
          title: 'Enhanced Checkout Test',
          headerBackTitle: 'Tests',
        }}
      />
      <Stack.Screen 
        name="ProfileManagementTest" 
        component={ProfileManagementTestScreen}
        options={{
          title: 'Profile Management Test',
          headerBackTitle: 'Tests',
        }}
      />
      <Stack.Screen 
        name="StaffQRScannerTest" 
        component={StaffQRScannerTestScreen}
        options={{
          title: 'Staff QR Scanner Test',
          headerBackTitle: 'Tests',
        }}
      />
      <Stack.Screen 
        name="HybridAuthTest" 
        component={HybridAuthTestScreen}
        options={{
          title: 'Hybrid Auth Test',
          headerBackTitle: 'Tests',
        }}
      />
      <Stack.Screen 
        name="AdminOrderTest" 
        component={AdminOrderTestScreen}
        options={{
          title: 'Admin Order Test',
          headerBackTitle: 'Tests',
        }}
      />
      <Stack.Screen 
        name="ProductDebugTest" 
        component={ProductDebugTestScreen}
        options={{ title: 'Product Debug Test' }}
      />
      <Stack.Screen 
        name="RealtimeTest" 
        component={RealtimeTestScreen}
        options={{ title: 'Real-time Integration Test' }}
      />
      <Stack.Screen 
        name="BroadcastArchitectureTest" 
        component={BroadcastArchitectureTestScreen}
        options={{ title: 'Broadcast Architecture Test' }}
      />
      <Stack.Screen 
        name="SimpleBroadcastTest" 
        component={SimpleBroadcastTest}
        options={{ title: 'Simple Broadcast Test' }}
      />
      <Stack.Screen 
        name="SecurityBroadcastTest" 
        component={SecurityBroadcastTestScreen}
        options={{ title: 'Security Broadcast Test' }}
      />
      <Stack.Screen 
        name="AutomatedTest" 
        component={AutomatedTestRunner}
        options={{
          title: 'Automated Test Runner',
          headerBackTitle: 'Tests',
        }}
      />
      <Stack.Screen 
        name="BackendIntegrationTest" 
        component={BackendIntegrationTestScreen}
        options={{
          title: 'Backend Integration Test',
          headerBackTitle: 'Tests',
        }}
      />
      <Stack.Screen 
        name="CartRPCTest" 
        component={CartRPCTest} 
        options={{ title: 'Cart RPC Function Test' }} 
      />
      <Stack.Screen 
        name="AtomicOrderTest" 
        component={AtomicOrderTest} 
        options={{ title: 'Atomic Order Submission Test' }} 
      />
      <Stack.Screen 
        name="SchemaInspector" 
        component={SchemaInspector} 
        options={{ title: 'Database Schema Inspector' }} 
      />
      <Stack.Screen 
        name="SimpleStockValidationTest" 
        component={SimpleStockValidationTest} 
        options={{ title: 'Real-Time Stock Validation Test' }} 
      />
      <Stack.Screen 
        name="CartMigrationTest" 
        component={CartMigrationTestScreen} 
        options={{ title: 'Cart Migration Test - Phase 1' }} 
      />
      <Stack.Screen 
        name="AtomicOperationsTest" 
        component={AtomicOperationsTestScreen} 
        options={{ title: 'Atomic Operations Test Suite' }} 
      />
    </Stack.Navigator>
  );
};
