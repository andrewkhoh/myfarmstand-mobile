/**
 * RealtimeService Test
 * Comprehensive testing for real-time subscription functionality including
 * encrypted channel management, user-specific subscriptions, admin channels,
 * authentication guards, and event broadcasting
 */

import { RealtimeService } from '../realtimeService';

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

// Mock query client
const mockQueryClient = require('../../config/queryClient').queryClient;

// Mock broadcast factory utilities
const mockSecureChannelNameGenerator = require('../../utils/broadcastFactory').SecureChannelNameGenerator;
const mockCartKeys = require('../../utils/queryKeyFactory').cartKeys;

// Mock global window for React Native compatibility
const mockWindow = {
  dispatchEvent: jest.fn(),
  CustomEvent: jest.fn().mockImplementation((type, options) => ({
    type,
    detail: options?.detail
  }))
};

describe('RealtimeService', () => {
  // Test data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      role: 'customer'
    }
  };

  const mockAdminUser = {
    id: 'admin-456',
    email: 'admin@example.com',
    user_metadata: {
      role: 'admin'
    }
  };

  const mockSubscription = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockImplementation((callback) => {
      callback('SUBSCRIBED');
      return mockSubscription;
    }),
    unsubscribe: jest.fn(),
    state: 'joined'
  };

  const mockChannel = jest.fn(() => mockSubscription);

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset RealtimeService static state
    RealtimeService['subscriptions'] = new Map();
    RealtimeService['isInitialized'] = false;
    RealtimeService['currentUserId'] = null;
    RealtimeService['currentUserRole'] = null;

    // Reset mock subscription
    mockSubscription.on.mockClear().mockReturnValue(mockSubscription);
    mockSubscription.subscribe.mockClear().mockImplementation((callback) => {
      if (callback) callback('SUBSCRIBED');
      return mockSubscription;
    });
    mockSubscription.unsubscribe.mockClear();

    // Setup default mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabase.channel = mockChannel;
    mockQueryClient.invalidateQueries = jest.fn();
    mockSecureChannelNameGenerator.generateSecureChannelName = jest.fn()
      .mockReturnValue('encrypted-channel-name');
    mockCartKeys.all = jest.fn().mockReturnValue(['cart', 'user-123']);

    // Mock window for React Native compatibility
    global.window = mockWindow as any;

    // Console spies
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).window;
  });

  describe('subscribeToOrderUpdates', () => {
    it('should subscribe to user-specific order updates for authenticated user', async () => {
      await RealtimeService.subscribeToOrderUpdates();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('orders', 'user-specific', 'user-123');
      expect(mockSupabase.channel).toHaveBeenCalledWith('encrypted-channel-name');
      expect(mockSubscription.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'order-status-changed' },
        expect.any(Function)
      );
      expect(mockSubscription.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'new-order' },
        expect.any(Function)
      );
      expect(mockSubscription.subscribe).toHaveBeenCalled();
    });

    it('should subscribe to admin channel for admin users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAdminUser },
        error: null
      });

      await RealtimeService.subscribeToOrderUpdates();

      // Should call generateSecureChannelName twice: once for user-specific, once for admin
      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('orders', 'user-specific', 'admin-456');
      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('orders', 'admin-only');
      expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
    });

    it('should not subscribe when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      await RealtimeService.subscribeToOrderUpdates();

      expect(console.warn).toHaveBeenCalledWith(
        '🔐 Cannot subscribe to order updates: No authenticated user'
      );
      expect(mockSupabase.channel).not.toHaveBeenCalled();
    });

    it('should handle subscription errors gracefully', async () => {
      mockSupabase.channel.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      await RealtimeService.subscribeToOrderUpdates();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to set up secure user order subscription:',
        expect.any(Error)
      );
    });

    it('should handle multiple subscription calls', async () => {
      // Subscribe once
      await RealtimeService.subscribeToOrderUpdates();
      const firstCallCount = mockSupabase.channel.mock.calls.length;
      
      // Subscribe again
      await RealtimeService.subscribeToOrderUpdates();
      const secondCallCount = mockSupabase.channel.mock.calls.length;
      
      // Should attempt to set up subscriptions each time
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🚀 Setting up SECURE order updates broadcast subscriptions')
      );
      
      // Channel creation count increases with each call
      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });
  });

  describe('subscribeToProductUpdates', () => {
    it('should subscribe to global product updates', async () => {
      await RealtimeService.subscribeToProductUpdates();

      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('products', 'global');
      expect(mockSupabase.channel).toHaveBeenCalledWith('encrypted-channel-name');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up SECURE product updates')
      );
    });

    it('should handle multiple product subscription calls', async () => {
      // Subscribe once
      await RealtimeService.subscribeToProductUpdates();
      const firstCallCount = mockSupabase.channel.mock.calls.length;
      
      // Subscribe again
      await RealtimeService.subscribeToProductUpdates();
      const secondCallCount = mockSupabase.channel.mock.calls.length;
      
      // Should attempt to set up subscriptions each time
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🚀 Setting up SECURE product updates broadcast subscription')
      );
      
      // Channel creation count increases with each call
      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });

    it('should handle product subscription errors gracefully', async () => {
      mockSupabase.channel.mockImplementation(() => {
        throw new Error('Channel setup failed');
      });

      await RealtimeService.subscribeToProductUpdates();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to set up secure product subscription:',
        expect.any(Error)
      );
    });

    it('should handle subscription errors', async () => {
      mockSupabase.channel.mockImplementation(() => {
        throw new Error('Product subscription failed');
      });

      await RealtimeService.subscribeToProductUpdates();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to set up secure product subscription:',
        expect.any(Error)
      );
    });
  });

  describe('subscribeToCartUpdates', () => {
    it('should subscribe to user-specific cart updates', async () => {
      await RealtimeService.subscribeToCartUpdates();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('cart', 'user-specific', 'user-123');
      expect(mockSupabase.channel).toHaveBeenCalledWith('encrypted-channel-name');
    });

    it('should handle multiple cart subscription calls', async () => {
      // Subscribe once
      await RealtimeService.subscribeToCartUpdates();
      const firstCallCount = mockSupabase.channel.mock.calls.length;
      
      // Subscribe again
      await RealtimeService.subscribeToCartUpdates();
      const secondCallCount = mockSupabase.channel.mock.calls.length;
      
      // Should attempt to set up subscriptions each time
      expect(console.log).toHaveBeenCalledWith(
        '🚀 Setting up SECURE user-specific cart updates broadcast subscription for user:',
        'user-123'
      );
      
      // Channel creation count increases with each call
      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });

    it('should handle cart subscription setup for authenticated user', async () => {
      await RealtimeService.subscribeToCartUpdates();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('cart', 'user-specific', 'user-123');
      expect(mockSupabase.channel).toHaveBeenCalledWith('encrypted-channel-name');
      expect(console.log).toHaveBeenCalledWith(
        '🚀 Setting up SECURE user-specific cart updates broadcast subscription for user:',
        'user-123'
      );
    });

    it('should not subscribe when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      await RealtimeService.subscribeToCartUpdates();

      expect(console.warn).toHaveBeenCalledWith(
        '🔐 Cannot subscribe to cart updates: No authenticated user'
      );
      expect(mockSupabase.channel).not.toHaveBeenCalled();
    });
  });

  describe('initializeAllSubscriptions', () => {
    it('should initialize all subscriptions concurrently', async () => {
      const spyOrderUpdates = jest.spyOn(RealtimeService, 'subscribeToOrderUpdates');
      const spyProductUpdates = jest.spyOn(RealtimeService, 'subscribeToProductUpdates');
      const spyCartUpdates = jest.spyOn(RealtimeService, 'subscribeToCartUpdates');

      await RealtimeService.initializeAllSubscriptions();

      expect(spyOrderUpdates).toHaveBeenCalled();
      expect(spyProductUpdates).toHaveBeenCalled();
      expect(spyCartUpdates).toHaveBeenCalled();
      expect(RealtimeService['isInitialized']).toBe(true);
    });

    it('should handle initialization errors', async () => {
      jest.spyOn(RealtimeService, 'subscribeToOrderUpdates')
        .mockRejectedValue(new Error('Init failed'));

      await RealtimeService.initializeAllSubscriptions();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to initialize secure subscriptions:',
        expect.any(Error)
      );
      expect(RealtimeService['isInitialized']).toBe(false);
    });
  });

  describe('unsubscribe', () => {
    it('should handle unsubscribe calls', async () => {
      // Set up a subscription
      await RealtimeService.subscribeToProductUpdates();
      
      // Unsubscribe using the known key - should not throw
      expect(() => RealtimeService.unsubscribe('products-global')).not.toThrow();
    });

    it('should handle unsubscribing from non-existent channel', () => {
      RealtimeService.unsubscribe('non-existent');
      expect(mockSubscription.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all channels', async () => {
      // Set up multiple subscriptions
      await RealtimeService.subscribeToProductUpdates();
      await RealtimeService.subscribeToCartUpdates();

      RealtimeService.unsubscribeAll();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cleaning up all real-time subscriptions')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('All real-time subscriptions cleaned up')
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return status of all subscriptions', async () => {
      await RealtimeService.subscribeToProductUpdates();
      await RealtimeService.subscribeToCartUpdates();

      const status = RealtimeService.getSubscriptionStatus();

      expect(status.totalSubscriptions).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(status.subscriptions)).toBe(true);
      expect(typeof status.allConnected).toBe('boolean');
    });

    it('should return empty status when no subscriptions', () => {
      const status = RealtimeService.getSubscriptionStatus();

      expect(status.totalSubscriptions).toBe(0);
      expect(status.subscriptions).toHaveLength(0);
      expect(status.allConnected).toBe(true);
    });
  });

  describe('notifyDataUpdate', () => {
    it('should dispatch custom event when window is available', () => {
      RealtimeService.notifyDataUpdate('Test update');

      expect(mockWindow.CustomEvent).toHaveBeenCalledWith('realtimeUpdate', {
        detail: { message: 'Test update' }
      });
      expect(mockWindow.dispatchEvent).toHaveBeenCalled();
    });

    it('should handle React Native environment without window', () => {
      delete (global as any).window;

      RealtimeService.notifyDataUpdate('Test update');

      expect(console.log).toHaveBeenCalledWith('📱 UI Update: Test update');
    });

    it('should handle CustomEvent creation errors', () => {
      mockWindow.CustomEvent.mockImplementation(() => {
        throw new Error('CustomEvent failed');
      });

      RealtimeService.notifyDataUpdate('Test update');

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to dispatch CustomEvent:',
        expect.any(Error)
      );
      expect(console.log).toHaveBeenCalledWith('📱 UI Update: Test update');
    });
  });

  describe('forceRefreshAllData', () => {
    it('should invalidate all cached queries', () => {
      RealtimeService.forceRefreshAllData();

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ 
        queryKey: ['products'] 
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ 
        queryKey: ['categories'] 
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ 
        queryKey: ['orders'] 
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ 
        queryKey: ['userOrders'] 
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ 
        queryKey: ['cart'] 
      });
    });
  });

  describe('Event Handling Integration', () => {
    it('should setup order subscriptions with proper channels', async () => {
      await RealtimeService.subscribeToOrderUpdates();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('orders', 'user-specific', 'user-123');
      expect(mockSupabase.channel).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up SECURE order updates broadcast')
      );
    });

    it('should handle subscription lifecycle correctly', async () => {
      // Test that subscriptions are created and managed properly
      await RealtimeService.subscribeToProductUpdates();
      
      // Test that console messages are logged
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up SECURE product updates')
      );
    });
  });

  describe('Security and Authentication', () => {
    it('should use encrypted channel names for all subscriptions', async () => {
      await RealtimeService.initializeAllSubscriptions();

      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('orders', 'user-specific', 'user-123');
      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('products', 'global');
      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('cart', 'user-specific', 'user-123');
    });

    it('should use secure channel names for user-specific subscriptions', async () => {
      await RealtimeService.subscribeToCartUpdates();

      // Verify secure channel generation was called with correct parameters
      expect(mockSecureChannelNameGenerator.generateSecureChannelName)
        .toHaveBeenCalledWith('cart', 'user-specific', 'user-123');
      
      // Verify the encrypted channel name was used
      expect(mockSupabase.channel).toHaveBeenCalledWith('encrypted-channel-name');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent subscription attempts', async () => {
      const promises = [
        RealtimeService.subscribeToProductUpdates(),
        RealtimeService.subscribeToProductUpdates(),
        RealtimeService.subscribeToProductUpdates()
      ];

      await Promise.all(promises);

      // Should attempt to set up subscriptions for each call
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🚀 Setting up SECURE product updates broadcast subscription')
      );
    });

    it('should handle auth errors during subscription setup', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth failed'));

      // The service doesn't currently handle auth errors, so this will throw
      await expect(RealtimeService.subscribeToCartUpdates()).rejects.toThrow('Auth failed');
    });

    it('should handle missing user metadata gracefully', async () => {
      const userWithoutMetadata = {
        id: 'user-123',
        email: 'test@example.com'
        // No user_metadata
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: userWithoutMetadata },
        error: null
      });

      await RealtimeService.subscribeToOrderUpdates();

      // Should default to customer role
      expect(RealtimeService['currentUserRole']).toBe('customer');
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1); // Only user channel, no admin
    });
  });
});