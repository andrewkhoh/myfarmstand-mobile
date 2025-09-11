import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  AdminScreen,
  AdminOrderScreen,
  ProductManagementScreen,
  ProductCreateEditScreen,
  // Hub screens
  ExecutiveHub,
  MarketingHub,
  InventoryHub,
  // Executive screens
  ExecutiveDashboard,
  CustomerAnalytics,
  InventoryOverview,
  PerformanceAnalytics,
  RevenueInsights,
  // Marketing screens
  MarketingDashboard,
  CampaignManagementScreen,
  CampaignPlannerScreen,
  ProductContentScreen,
  BundleManagementScreen,
  MarketingAnalyticsScreen,
  // Inventory screens
  InventoryDashboardScreen,
  InventoryAlertsScreen,
  BulkOperationsScreen,
  StockMovementHistoryScreen,
} from '../screens';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminOrders: undefined;
  ProductManagement: undefined;
  ProductCreateEdit: { id?: string };
  
  // Hub screens
  ExecutiveHub: undefined;
  MarketingHub: undefined;
  InventoryHub: undefined;
  
  // Executive screens
  ExecutiveDashboard: undefined;
  CustomerAnalytics: undefined;
  InventoryOverview: undefined;
  PerformanceAnalytics: undefined;
  RevenueInsights: undefined;
  
  // Marketing screens
  MarketingDashboard: undefined;
  CampaignManagement: undefined;
  CampaignPlanner: undefined;
  ProductContent: undefined;
  BundleManagement: undefined;
  MarketingAnalytics: undefined;
  
  // Inventory screens
  InventoryDashboard: undefined;
  InventoryAlerts: undefined;
  BulkOperations: undefined;
  StockMovementHistory: undefined;
  
  // Deprecated screens (kept for backward compatibility)
  // These will be removed in a future version
  // MetricsAnalytics: undefined; // Use ExecutiveHub instead
  // StockManagement: undefined; // Use InventoryHub instead
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
        name="ProductManagement"
        component={ProductManagementScreen}
        options={{
          title: 'Product Management',
        }}
      />
      <Stack.Screen
        name="ProductCreateEdit"
        component={ProductCreateEditScreen}
        options={({ route }) => ({
          title: route.params?.id ? 'Edit Product' : 'Create Product',
        })}
      />
      
      {/* Hub Screens */}
      <Stack.Screen
        name="ExecutiveHub"
        component={ExecutiveHub}
        options={{
          title: 'Executive Analytics',
        }}
      />
      <Stack.Screen
        name="MarketingHub"
        component={MarketingHub}
        options={{
          title: 'Marketing Tools',
        }}
      />
      <Stack.Screen
        name="InventoryHub"
        component={InventoryHub}
        options={{
          title: 'Inventory Management',
        }}
      />
      
      {/* Executive Screens */}
      <Stack.Screen
        name="ExecutiveDashboard"
        component={ExecutiveDashboard}
        options={{
          title: 'Executive Dashboard',
        }}
      />
      <Stack.Screen
        name="CustomerAnalytics"
        component={CustomerAnalytics}
        options={{
          title: 'Customer Analytics',
        }}
      />
      <Stack.Screen
        name="InventoryOverview"
        component={InventoryOverview}
        options={{
          title: 'Inventory Overview',
        }}
      />
      <Stack.Screen
        name="PerformanceAnalytics"
        component={PerformanceAnalytics}
        options={{
          title: 'Performance Analytics',
        }}
      />
      <Stack.Screen
        name="RevenueInsights"
        component={RevenueInsights}
        options={{
          title: 'Revenue Insights',
        }}
      />
      
      {/* Marketing Screens */}
      <Stack.Screen
        name="MarketingDashboard"
        component={MarketingDashboard}
        options={{
          title: 'Marketing Dashboard',
        }}
      />
      <Stack.Screen
        name="CampaignManagement"
        component={CampaignManagementScreen}
        options={{
          title: 'Campaign Management',
        }}
      />
      <Stack.Screen
        name="CampaignPlanner"
        component={CampaignPlannerScreen}
        options={{
          title: 'Campaign Planner',
        }}
      />
      <Stack.Screen
        name="ProductContent"
        component={ProductContentScreen}
        options={{
          title: 'Product Content',
        }}
      />
      <Stack.Screen
        name="BundleManagement"
        component={BundleManagementScreen}
        options={{
          title: 'Bundle Management',
        }}
      />
      <Stack.Screen
        name="MarketingAnalytics"
        component={MarketingAnalyticsScreen}
        options={{
          title: 'Marketing Analytics',
        }}
      />
      
      {/* Inventory Screens */}
      <Stack.Screen
        name="InventoryDashboard"
        component={InventoryDashboardScreen}
        options={{
          title: 'Inventory Dashboard',
        }}
      />
      <Stack.Screen
        name="InventoryAlerts"
        component={InventoryAlertsScreen}
        options={{
          title: 'Inventory Alerts',
        }}
      />
      <Stack.Screen
        name="BulkOperations"
        component={BulkOperationsScreen}
        options={{
          title: 'Bulk Operations',
        }}
      />
      <Stack.Screen
        name="StockMovementHistory"
        component={StockMovementHistoryScreen}
        options={{
          title: 'Stock Movement History',
        }}
      />
    </Stack.Navigator>
  );
};
