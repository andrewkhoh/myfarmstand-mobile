import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRealtime, useRealtimeNotifications } from '../../hooks/useRealtime';
import { RealtimeService } from '../../services/realtimeService';
import { useProducts, useCategories } from '../../hooks/useProducts';
import { useOrders } from '../../hooks/useOrders';

export const RealtimeTestScreen = () => {
  const [debugInfo, setDebugInfo] = useState('Real-time Test Screen loaded');
  const [loading, setLoading] = useState(false);
  
  // Real-time hooks
  const {
    isInitialized,
    subscriptionStatus,
    refreshStatus,
    forceRefresh,
    initializeSubscriptions,
    cleanupSubscriptions,
    isUserAuthenticated
  } = useRealtime();
  
  const { lastUpdate, updateCount, hasRecentUpdate } = useRealtimeNotifications();
  
  // Data hooks to show real-time updates
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: orders, isLoading: ordersLoading } = useOrders();

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isInitialized) {
        refreshStatus();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isInitialized, refreshStatus]);

  const testManualSubscription = async () => {
    setLoading(true);
    try {
      setDebugInfo('Testing manual subscription setup...\n\n');
      
      // Clean up existing subscriptions
      RealtimeService.unsubscribeAll();
      setDebugInfo(prev => prev + '1. Cleaned up existing subscriptions\n');
      
      // Initialize new subscriptions
      RealtimeService.initializeAllSubscriptions();
      setDebugInfo(prev => prev + '2. Initialized new subscriptions\n');
      
      // Wait for connections to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check status
      const status = RealtimeService.getSubscriptionStatus();
      setDebugInfo(prev => prev + `3. Subscription Status:\n${JSON.stringify(status, null, 2)}\n\n✅ Manual subscription test completed!`);
      
      refreshStatus();
    } catch (err) {
      setDebugInfo(`Manual subscription test error: ${err}`);
    }
    setLoading(false);
  };

  const testDataRefresh = async () => {
    setLoading(true);
    try {
      setDebugInfo('Testing data refresh...\n\n');
      
      const beforeCounts = {
        products: products?.length || 0,
        categories: categories?.length || 0,
        orders: orders?.length || 0
      };
      
      setDebugInfo(prev => prev + `Before refresh:\n- Products: ${beforeCounts.products}\n- Categories: ${beforeCounts.categories}\n- Orders: ${beforeCounts.orders}\n\n`);
      
      // Force refresh all data
      RealtimeService.forceRefreshAllData();
      setDebugInfo(prev => prev + 'Triggered force refresh...\n');
      
      // Wait for data to refresh
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setDebugInfo(prev => prev + '\n✅ Data refresh test completed!\nCheck the data counts above to see if they updated.');
      
    } catch (err) {
      setDebugInfo(`Data refresh test error: ${err}`);
    }
    setLoading(false);
  };

  const testRealtimeUpdates = async () => {
    setLoading(true);
    try {
      setDebugInfo(`Testing real-time update detection...\n\n`);
      setDebugInfo(prev => prev + `Current update count: ${updateCount}\n`);
      setDebugInfo(prev => prev + `Last update: ${lastUpdate || 'None'}\n\n`);
      
      setDebugInfo(prev => prev + `Instructions for testing:\n`);
      setDebugInfo(prev => prev + `1. Open your Supabase dashboard\n`);
      setDebugInfo(prev => prev + `2. Go to the Table Editor\n`);
      setDebugInfo(prev => prev + `3. Edit a product, category, or order\n`);
      setDebugInfo(prev => prev + `4. Watch this screen for real-time updates!\n\n`);
      
      setDebugInfo(prev => prev + `Subscriptions active: ${subscriptionStatus.totalSubscriptions}\n`);
      setDebugInfo(prev => prev + `All connected: ${subscriptionStatus.allConnected ? '✅' : '❌'}\n\n`);
      
      setDebugInfo(prev => prev + `🔄 Listening for real-time updates...\n`);
      setDebugInfo(prev => prev + `This test will run for 30 seconds.\n`);
      
      // Listen for updates for 30 seconds
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed >= 30) {
          clearInterval(checkInterval);
          setDebugInfo(prev => prev + `\n⏰ 30-second test completed.\n`);
          setDebugInfo(prev => prev + `Final update count: ${updateCount}\n`);
          setLoading(false);
        }
      }, 1000);
      
    } catch (err) {
      setDebugInfo(`Real-time update test error: ${err}`);
      setLoading(false);
    }
  };

  const showConnectionDetails = () => {
    const details = `Connection Details:\n\n` +
      `User Authenticated: ${isUserAuthenticated ? '✅' : '❌'}\n` +
      `Subscriptions Initialized: ${isInitialized ? '✅' : '❌'}\n` +
      `Total Subscriptions: ${subscriptionStatus.totalSubscriptions}\n` +
      `All Connected: ${subscriptionStatus.allConnected ? '✅' : '❌'}\n\n` +
      `Individual Subscriptions:\n` +
      subscriptionStatus.subscriptions.map(sub => 
        `- ${sub.channel}: ${sub.isConnected ? '✅' : '❌'} (${sub.state})`
      ).join('\n') + '\n\n' +
      `Data Loading States:\n` +
      `- Products: ${productsLoading ? 'Loading...' : `${products?.length || 0} items`}\n` +
      `- Categories: ${categoriesLoading ? 'Loading...' : `${categories?.length || 0} items`}\n` +
      `- Orders: ${ordersLoading ? 'Loading...' : `${orders?.length || 0} items`}\n\n` +
      `Real-time Notifications:\n` +
      `- Update Count: ${updateCount}\n` +
      `- Last Update: ${lastUpdate || 'None'}\n` +
      `- Has Recent Update: ${hasRecentUpdate ? '✅' : '❌'}`;
    
    setDebugInfo(details);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Real-time Integration Test
      </Text>

      {/* Status Overview */}
      <View style={{ marginBottom: 20, padding: 15, backgroundColor: 'white', borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Status Overview</Text>
        <Text>🔐 User Authenticated: {isUserAuthenticated ? '✅' : '❌'}</Text>
        <Text>🚀 Subscriptions Initialized: {isInitialized ? '✅' : '❌'}</Text>
        <Text>📡 Total Subscriptions: {subscriptionStatus.totalSubscriptions}</Text>
        <Text>🔗 All Connected: {subscriptionStatus.allConnected ? '✅' : '❌'}</Text>
        <Text>🔔 Update Count: {updateCount}</Text>
        {hasRecentUpdate && (
          <Text style={{ color: '#4caf50', fontWeight: 'bold' }}>
            🔄 {lastUpdate}
          </Text>
        )}
      </View>

      {/* Test Buttons */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#2196f3', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={showConnectionDetails}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            📊 Show Connection Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#4caf50', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={testManualSubscription}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🔧 Test Manual Subscription
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#ff9800', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={testDataRefresh}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🔄 Test Data Refresh
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#9c27b0', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={testRealtimeUpdates}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            ⚡ Test Real-time Updates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#f44336', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={cleanupSubscriptions}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🧹 Cleanup Subscriptions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#607d8b', padding: 15, borderRadius: 8, marginBottom: 10 }}
          onPress={initializeSubscriptions}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🚀 Initialize Subscriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <ActivityIndicator size="large" color="#2196f3" />
          <Text style={{ marginTop: 10, color: '#666' }}>Running test...</Text>
        </View>
      )}

      {/* Debug Output */}
      <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#263238', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4caf50', marginBottom: 10 }}>
          Debug Output
        </Text>
        <ScrollView style={{ maxHeight: 400 }}>
          <Text style={{ color: '#e0e0e0', fontFamily: 'monospace', fontSize: 12 }}>
            {debugInfo}
          </Text>
        </ScrollView>
      </View>

      {/* Instructions */}
      <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#fff3e0', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#f57c00', marginBottom: 10 }}>
          📋 Testing Instructions
        </Text>
        <Text style={{ color: '#bf360c', lineHeight: 20 }}>
          1. Ensure you're logged in to see real-time subscriptions{'\n'}
          2. Use "Show Connection Details" to verify all subscriptions are active{'\n'}
          3. Use "Test Real-time Updates" and then modify data in Supabase dashboard{'\n'}
          4. Watch for real-time update notifications in the status overview{'\n'}
          5. Use "Test Data Refresh" to manually trigger cache invalidation
        </Text>
      </View>
    </ScrollView>
  );
};
