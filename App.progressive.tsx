import React, { useState, useEffect, lazy, Suspense } from 'react';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/config/queryClient';

// Feature flags
const FEATURES = {
  CORE: true,
  INVENTORY: false,
  MARKETING: false,
  EXECUTIVE: false,
  REALTIME: false,
  KIOSK: false,
};

// Core navigation without heavy features
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// Lazy load inventory components
const InventoryScreen = lazy(() => import('./src/screens/inventory/InventoryListScreen'));

// Simple Home screen for testing
function HomeScreen({ navigation, features, setFeatures }: any) {
  const [loadingModule, setLoadingModule] = useState<string | null>(null);
  
  const handleInventoryToggle = async () => {
    if (!features.INVENTORY) {
      setLoadingModule('inventory');
      console.log('[Progressive] Loading inventory module...');
      // Simulate loading time
      setTimeout(() => {
        setFeatures((prev: any) => ({ ...prev, INVENTORY: true }));
        setLoadingModule(null);
        console.log('[Progressive] Inventory module loaded');
      }, 500);
    } else {
      setFeatures((prev: any) => ({ ...prev, INVENTORY: false }));
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyFarmstand - Progressive Load</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Core Features:</Text>
        <Button title="Products" onPress={() => console.log('Products')} />
        <Button title="Cart" onPress={() => console.log('Cart')} />
        <Button title="Auth" onPress={() => console.log('Auth')} />
        {features.INVENTORY && (
          <Button 
            title="Go to Inventory" 
            onPress={() => navigation.navigate('Inventory')}
            color="#4CAF50"
          />
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Modules:</Text>
        <View style={styles.featureRow}>
          <Text>Inventory: </Text>
          {loadingModule === 'inventory' ? (
            <ActivityIndicator size="small" />
          ) : (
            <Button 
              title={features.INVENTORY ? "Disable" : "Enable"} 
              onPress={handleInventoryToggle}
            />
          )}
        </View>
        <View style={styles.featureRow}>
          <Text>Marketing: </Text>
          <Button 
            title={features.MARKETING ? "Enabled" : "Enable"} 
            onPress={() => setFeatures(prev => ({ ...prev, MARKETING: !prev.MARKETING }))}
          />
        </View>
        <View style={styles.featureRow}>
          <Text>Executive: </Text>
          <Button 
            title={features.EXECUTIVE ? "Enabled" : "Enable"} 
            onPress={() => setFeatures(prev => ({ ...prev, EXECUTIVE: !prev.EXECUTIVE }))}
          />
        </View>
      </View>
      
      <Text style={styles.status}>
        Loaded: Core {features.INVENTORY && '+ Inventory'} {features.MARKETING && '+ Marketing'} {features.EXECUTIVE && '+ Executive'}
      </Text>
    </View>
  );
}

function SimpleNavigator() {
  const [features, setFeatures] = useState(FEATURES);
  
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home">
          {(props) => <HomeScreen {...props} features={features} setFeatures={setFeatures} />}
        </Stack.Screen>
        {features.INVENTORY && (
          <Stack.Screen name="Inventory">
            {() => (
              <Suspense fallback={
                <View style={styles.container}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text>Loading Inventory Module...</Text>
                </View>
              }>
                <InventoryScreen />
              </Suspense>
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Simulate minimal initialization
    console.log('[App.progressive] Starting with core features only');
    setTimeout(() => setIsReady(true), 100);
  }, []);
  
  if (!isReady) {
    return (
      <View style={styles.container}>
        <Text>Loading Core...</Text>
      </View>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <SimpleNavigator />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginVertical: 20,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  status: {
    marginTop: 20,
    fontStyle: 'italic',
  },
});
