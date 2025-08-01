import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { RootTabParamList } from '../types';

// Import screens
import { ShopScreen, CartScreen, ProfileScreen, AdminScreen } from '../screens';
import { TestStackNavigator } from './TestStackNavigator';

const Tab = createBottomTabNavigator<RootTabParamList>();

const CartBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
};

export const MainTabNavigator: React.FC = () => {
  const { user } = useAuth();
  const { items } = useCart();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'staff';
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

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
              return (
                <View>
                  <Ionicons name={iconName} size={size} color={color} />
                  <CartBadge count={cartItemCount} />
                </View>
              );
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Admin':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            case 'TestHub':
              iconName = focused ? 'flask' : 'flask-outline';
              break;
            case 'Test':
              iconName = focused ? 'flask' : 'flask-outline';
              break;
            case 'CatalogTest':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'DataTest':
              iconName = focused ? 'server' : 'server-outline';
              break;
            case 'EnhancedCatalogTest':
              iconName = focused ? 'layers' : 'layers-outline';
              break;
            case 'CartFunctionalityTest':
              iconName = focused ? 'basket' : 'basket-outline';
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
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
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
        options={{ 
          title: 'Cart',
          tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined
        }}
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
        name="TestHub" 
        component={TestStackNavigator}
        options={{ title: 'Tests', headerShown: false }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 12,
  },
});
