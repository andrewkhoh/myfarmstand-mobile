import { useEffect, useState } from 'react';
import { RealtimeService } from '../services/realtimeService';
import { useCurrentUser } from './useAuth';

/**
 * Hook to manage real-time subscriptions
 * Automatically subscribes when user is authenticated and unsubscribes on logout
 */
export const useRealtime = () => {
  const { data: user } = useCurrentUser();
  const [isInitialized, setIsInitialized] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    totalSubscriptions: number;
    subscriptions: Array<{
      channel: string;
      state: any;
      isConnected: boolean;
    }>;
    allConnected: boolean;
  }>({
    totalSubscriptions: 0,
    subscriptions: [],
    allConnected: false
  });

  // Initialize subscriptions when user is authenticated
  useEffect(() => {
    if (user && !isInitialized) {
      console.log('🚀 User authenticated, initializing real-time subscriptions...');
      RealtimeService.initializeAllSubscriptions();
      setIsInitialized(true);
      
      // Update status after a brief delay to allow connections to establish
      setTimeout(() => {
        setSubscriptionStatus(RealtimeService.getSubscriptionStatus());
      }, 1000);
    }
    
    // Clean up subscriptions when user logs out
    if (!user && isInitialized) {
      console.log('🧹 User logged out, cleaning up real-time subscriptions...');
      RealtimeService.unsubscribeAll();
      setIsInitialized(false);
      setSubscriptionStatus({
        totalSubscriptions: 0,
        subscriptions: [],
        allConnected: false
      });
    }
  }, [user, isInitialized]);

  // Refresh subscription status
  const refreshStatus = () => {
    setSubscriptionStatus(RealtimeService.getSubscriptionStatus());
  };

  // Force refresh all data
  const forceRefresh = () => {
    RealtimeService.forceRefreshAllData();
  };

  // Manual subscription management
  const initializeSubscriptions = () => {
    if (user) {
      RealtimeService.initializeAllSubscriptions();
      setIsInitialized(true);
      setTimeout(refreshStatus, 1000);
    }
  };

  const cleanupSubscriptions = () => {
    RealtimeService.unsubscribeAll();
    setIsInitialized(false);
    setSubscriptionStatus({
      totalSubscriptions: 0,
      subscriptions: [],
      allConnected: false
    });
  };

  return {
    isInitialized,
    subscriptionStatus,
    refreshStatus,
    forceRefresh,
    initializeSubscriptions,
    cleanupSubscriptions,
    isUserAuthenticated: !!user
  };
};

/**
 * Hook to listen for real-time update notifications
 * Components can use this to show user feedback when data updates
 */
export const useRealtimeNotifications = () => {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    const handleRealtimeUpdate = (event: CustomEvent) => {
      setLastUpdate(event.detail.message);
      setUpdateCount(prev => prev + 1);
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setLastUpdate(null);
      }, 3000);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('realtimeUpdate', handleRealtimeUpdate as EventListener);
      
      return () => {
        window.removeEventListener('realtimeUpdate', handleRealtimeUpdate as EventListener);
      };
    }
  }, []);

  return {
    lastUpdate,
    updateCount,
    hasRecentUpdate: !!lastUpdate
  };
};
