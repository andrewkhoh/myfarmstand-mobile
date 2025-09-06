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
import { crashReporting } from './src/services/crashReportingService';
import { secretsInitializer } from './src/services/secretsInitializer';
import { KioskProvider } from './src/contexts';
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
  
  // Initialize secrets and crash reporting on app start
  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize secrets first
        await secretsInitializer.initialize();
        
        // Then initialize crash reporting
        crashReporting.logEvent('app_start', {
          timestamp: new Date().toISOString(),
          platform: 'react-native',
        });
        
      } catch (error) {
        console.error('App initialization failed:', error);
        
        // Log the error but don't crash the app
        crashReporting.logError(error as Error, {
          action: 'app_initialization',
        });
      }
    };
    
    initializeApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <KioskProvider>
        <RealtimeProvider>
          {/* <CartProvider> */}
            <AppNavigator />
            <StatusBar style="auto" />
          {/* </CartProvider> */}
        </RealtimeProvider>
      </KioskProvider>
    </QueryClientProvider>
  );
}
