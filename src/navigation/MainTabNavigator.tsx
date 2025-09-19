import React from 'react';
// import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { colors } from '../utils/theme';
import { useCurrentUserRole } from '../hooks/role-based/useUnifiedRole';
import { useCart } from '../hooks/useCart';
import { RootTabParamList } from '../types';

// Import screens
import { ShopScreen, CartScreen, ProfileScreen, MyOrdersScreen, StaffQRScannerScreen } from '../screens';
import { TestStackNavigator } from './TestStackNavigator';
import { AdminStackNavigator } from './AdminStackNavigator';

const Tab = createBottomTabNavigator<RootTabParamList>();

const CartBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <RNText style={styles.badgeRNText}>
        {count > 99 ? '99+' : count.toString()}
      </RNText>
    </View>
  );
};

export const MainTabNavigator: React.FC = () => {
  const { isAdmin, isExecutive, isStaff } = useCurrentUserRole();
  const { items } = useCart();

  // Secure access checks using unified role system
  const hasStaffAccess = isAdmin || isExecutive || isStaff;
  const cartItemCount = items.reduce((total: number, item: any) => total + item.quantity, 0);

  // Debug badge count changes
  console.log('🏷️ BADGE COUNT UPDATE:', {
    itemsLength: items.length,
    cartItemCount,
    timestamp: new Date().toISOString().split('T')[1]
  });

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
            case 'MyOrders':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Admin':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            case 'StaffQRScanner':
              iconName = focused ? 'qr-code' : 'qr-code-outline';
              break;
            case 'TestHub':
              iconName = focused ? 'flask' : 'flask-outline';
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
        name="MyOrders"
        component={MyOrdersScreen}
        options={{ title: 'My Orders' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      {hasStaffAccess && (
        <Tab.Screen
          name="Admin"
          component={AdminStackNavigator}
          options={{ title: 'Admin', headerShown: false }}
        />
      )}
      {hasStaffAccess && (
        <Tab.Screen
          name="StaffQRScanner"
          component={StaffQRScannerScreen}
          options={{ title: 'QR Scanner' }}
        />
      )}
      {(__DEV__ || process.env.EXPO_PUBLIC_SHOW_TESTS === 'true') && (
        <Tab.Screen
          name="TestHub"
          component={TestStackNavigator}
          options={{ title: 'Tests', headerShown: false }}
        />
      )}
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
  badgeRNText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 12,
  },
});
