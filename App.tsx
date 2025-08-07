import React from 'react';
import 'react-native-gesture-handler';
// Crypto polyfill for React Native
import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/config/queryClient';
import { useRealtime } from './src/hooks/useRealtime';
import { ChannelManager } from './src/utils/channelManager';
import { AppNavigator } from './src/navigation/AppNavigator';

// Component to initialize real-time subscriptions
const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize shared channels for broadcast events
  React.useEffect(() => {
    ChannelManager.initialize();
    return () => {
      ChannelManager.cleanup();
    };
  }, []);
  
  useRealtime(); // Initialize real-time subscriptions
  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        {/* <CartProvider> */}
          <AppNavigator />
          <StatusBar style="auto" />
        {/* </CartProvider> */}
      </RealtimeProvider>
    </QueryClientProvider>
  );
}
