import React from 'react';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Button } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/config/queryClient';

// Test which features work
const FEATURES_STATUS = {
  Auth: '✅ Working',
  Cart: '✅ Working', 
  Realtime: '✅ Working',
  Core: '⚠️ Partial (AppNavigator has TS errors)',
  Products: '⚠️ Partial (useProducts has TS errors)',
  Inventory: '⚠️ Partial (missing hooks, screen errors)',
  Marketing: '❌ Broken (missing types/exports)',
  Executive: '❌ Broken (missing services)',
  Kiosk: '❌ Broken (missing screens)'
};

// Import only working features
import { useAuth } from './src/hooks/useAuth';
import { useCart } from './src/hooks/useCart';
import { useRealtime } from './src/hooks/useRealtime';

function TestApp() {
  const { user, signIn, signOut } = useAuth();
  const { cart, addToCart } = useCart();
  
  // Initialize realtime
  useRealtime();
  
  return (
    <View style={{ flex: 1, padding: 20, paddingTop: 60 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        MyFarmstand - Feature Test
      </Text>
      
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Feature Status:</Text>
      {Object.entries(FEATURES_STATUS).map(([feature, status]) => (
        <Text key={feature} style={{ marginLeft: 10, marginBottom: 5 }}>
          {status}
        </Text>
      ))}
      
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          Auth: {user ? `Logged in as ${user.email}` : 'Not logged in'}
        </Text>
        <Button 
          title={user ? "Sign Out" : "Sign In"} 
          onPress={() => user ? signOut() : signIn('test@example.com', 'password')}
        />
      </View>
      
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          Cart: {cart?.items?.length || 0} items
        </Text>
        <Button 
          title="Add Test Item" 
          onPress={() => addToCart({ productId: 'test-1', quantity: 1 })}
        />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TestApp />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
