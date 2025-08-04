import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useCurrentUser } from '../hooks/useAuth';
import { Loading } from '../components';
import { MainTabNavigator } from '../navigation/MainTabNavigator';
import { LoginScreen, RegisterScreen, ProductDetailScreen, CheckoutScreen, OrderConfirmationScreen } from '../screens';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { data: user, isLoading, error } = useCurrentUser();
  const isAuthenticated = !!user && !error;

  if (isLoading) {
    return <Loading message="Loading..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="ProductDetail" 
              component={ProductDetailScreen}
              options={{ headerShown: true, title: 'Product Details' }}
            />
            <Stack.Screen 
              name="Checkout" 
              component={CheckoutScreen}
              options={{ headerShown: true, title: 'Checkout' }}
            />
            <Stack.Screen 
              name="OrderConfirmation" 
              component={OrderConfirmationScreen}
              options={{ headerShown: true, title: 'Order Confirmation' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
