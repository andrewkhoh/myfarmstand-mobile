import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TestHubScreen, TestScreen, ProductCatalogTestScreen, DataLayerTestScreen, EnhancedCatalogTestScreen, CartFunctionalityTestScreen } from '../screens';

export type TestStackParamList = {
  TestHub: undefined;
  Test: undefined;
  CatalogTest: undefined;
  DataTest: undefined;
  EnhancedCatalogTest: undefined;
  CartFunctionalityTest: undefined;
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
        options={{ title: 'Shopping Cart Tests' }}
      />
    </Stack.Navigator>
  );
};
