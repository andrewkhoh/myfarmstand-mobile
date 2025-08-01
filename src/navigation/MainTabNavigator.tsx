import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';
import { RootTabParamList } from '../types';

// Import screens
import { ShopScreen, CartScreen, ProfileScreen, AdminScreen, TestScreen, ProductCatalogTestScreen, DataLayerTestScreen } from '../screens';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'staff';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Shop':
              iconName = focused ? 'storefront' : 'storefront-outline';
              break;
            case 'Cart':
              iconName = focused ? 'basket' : 'basket-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Admin':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            case 'Test':
              iconName = focused ? 'flask' : 'flask-outline';
              break;
            case 'CatalogTest':
              iconName = focused ? 'storefront' : 'storefront-outline';
              break;
            case 'DataTest':
              iconName = focused ? 'server' : 'server-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border.light,
        },
        headerStyle: {
          backgroundColor: colors.primary[600],
        },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Shop" 
        component={ShopScreen}
        options={{ title: 'Farm Stand' }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ title: 'Cart' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{ title: 'Admin' }}
        />
      )}
      <Tab.Screen 
        name="Test" 
        component={TestScreen}
        options={{ title: 'Design Test' }}
      />
      <Tab.Screen 
        name="CatalogTest" 
        component={ProductCatalogTestScreen}
        options={{ title: 'Catalog Test' }}
      />
      <Tab.Screen 
        name="DataTest" 
        component={DataLayerTestScreen}
        options={{ title: 'Data Test' }}
      />
    </Tab.Navigator>
  );
};
