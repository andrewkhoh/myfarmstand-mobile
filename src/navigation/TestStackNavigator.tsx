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
  AutomatedTestRunner,
} from '../screens';

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
  AutomatedTest: undefined;
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
        name="AutomatedTest" 
        component={AutomatedTestRunner}
        options={{
          title: 'Automated Test Runner',
          headerBackTitle: 'Tests',
        }}
      />
    </Stack.Navigator>
  );
};
