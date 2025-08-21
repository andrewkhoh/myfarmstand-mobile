import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AdminScreen } from '../screens/AdminScreen';
import AdminOrderScreen from '../screens/AdminOrderScreen';
import MetricsAnalyticsScreen from '../screens/MetricsAnalyticsScreen';
import { ProductManagementScreen } from '../screens/ProductManagementScreen';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminOrders: undefined;
  MetricsAnalytics: undefined;
  ProductManagement: undefined;
};

const Stack = createStackNavigator<AdminStackParamList>();

export const AdminStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#3b82f6',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminScreen}
        options={{
          title: 'Admin Dashboard',
        }}
      />
      <Stack.Screen
        name="AdminOrders"
        component={AdminOrderScreen}
        options={{
          title: 'Order Management',
        }}
      />
      <Stack.Screen
        name="MetricsAnalytics"
        component={MetricsAnalyticsScreen}
        options={{
          title: 'Metrics & Analytics',
        }}
      />
      <Stack.Screen
        name="ProductManagement"
        component={ProductManagementScreen}
        options={{
          title: 'Product Management',
        }}
      />
    </Stack.Navigator>
  );
};
