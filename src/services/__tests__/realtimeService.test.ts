/**
 * RealtimeService Test - REFACTORED
 * Testing real-time subscription functionality with simplified mocks and factories
 */

import { RealtimeService } from '../realtimeService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createUser, createOrder, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

// Mock query client
jest.mock('../../config/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn()
  }
}));

// Mock broadcast factory utilities
jest.mock('../../utils/broadcastFactory', () => ({
  SecureChannelNameGenerator: {
    generate: jest.fn((type, userId) => `${type}_${userId}`)
  }
}));

jest.mock('../../utils/queryKeyFactory', () => ({
  cartKeys: {
    all: jest.fn(() => ['cart']),
    user: jest.fn((userId) => ['cart', userId])
  }
}));

describe('RealtimeService', () => {
  let supabaseMock: any;
  let testUser: any;
  let testAdmin: any;
  let testOrder: any;
  let mockQueryClient: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      email: 'test@example.com',
      role: 'customer'
    });
    
    testAdmin = createUser({
      id: 'admin-456',
      email: 'admin@example.com',
      role: 'admin'
    });
    
    testOrder = createOrder({
      id: 'order-123',
      user_id: 'user-123',
      status: 'pending'
    });
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      users: [testUser, testAdmin],
      orders: [testOrder]
    });
    
    // Set up auth state
    supabaseMock.setAuthState(testUser, {
      access_token: 'mock-token',
      user: testUser
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
    mockQueryClient = require('../../config/queryClient').queryClient;
    
    // Reset RealtimeService static state
    RealtimeService['subscriptions'] = new Map();
    RealtimeService['isInitialized'] = false;
    RealtimeService['currentUserId'] = null;
    RealtimeService['currentUserRole'] = null;
  });

  describe('subscribeToOrderUpdates', () => {
    it('should subscribe to user-specific order updates for authenticated user', async () => {
      const result = await RealtimeService.subscribeToOrderUpdates();

      expect(result.success).toBe(true);
      expect(result.channelName).toBe('orders_user-123');
      expect(RealtimeService['subscriptions'].has('orders')).toBe(true);
    });

    it('should subscribe to admin channel for admin users', async () => {
      // Set admin user as authenticated
      supabaseMock.setAuthState(testAdmin, {
        access_token: 'admin-token',
        user: testAdmin
      });

      const result = await RealtimeService.subscribeToOrderUpdates();

      expect(result.success).toBe(true);
      expect(result.channelName).toBe('orders_admin-456');
    });

    it('should not subscribe when user is not authenticated', async () => {
      // Clear auth state
      supabaseMock.setAuthState(null, null);

      const result = await RealtimeService.subscribeToOrderUpdates();

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not authenticated');
    });

    it('should handle subscription errors gracefully', async () => {
      // Mock channel subscription failure
      const mockChannel = supabaseMock.channel('test');
      mockChannel.subscribe = jest.fn().mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
        return mockChannel;
      });

      const result = await RealtimeService.subscribeToOrderUpdates();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to subscribe');
    });

    it('should handle multiple subscription calls', async () => {
      // First subscription
      const result1 = await RealtimeService.subscribeToOrderUpdates();
      expect(result1.success).toBe(true);

      // Second subscription (should reuse existing)
      const result2 = await RealtimeService.subscribeToOrderUpdates();
      expect(result2.success).toBe(true);
      expect(result2.channelName).toBe(result1.channelName);
    });
  });

  describe('subscribeToProductUpdates', () => {
    it('should subscribe to global product updates', async () => {
      const result = await RealtimeService.subscribeToProductUpdates();

      expect(result.success).toBe(true);
      expect(result.channelName).toContain('products');
      expect(RealtimeService['subscriptions'].has('products')).toBe(true);
    });

    it('should handle multiple product subscription calls', async () => {
      const result1 = await RealtimeService.subscribeToProductUpdates();
      const result2 = await RealtimeService.subscribeToProductUpdates();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.channelName).toBe(result2.channelName);
    });

    it('should handle product subscription errors gracefully', async () => {
      // Mock error in channel setup
      const originalChannel = supabaseMock.channel;
      supabaseMock.channel = jest.fn(() => {
        throw new Error('Channel creation failed');
      });

      const result = await RealtimeService.subscribeToProductUpdates();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to subscribe');

      // Restore original
      supabaseMock.channel = originalChannel;
    });
  });

  describe('subscribeToCartUpdates', () => {
    it('should subscribe to user-specific cart updates', async () => {
      const result = await RealtimeService.subscribeToCartUpdates();

      expect(result.success).toBe(true);
      expect(result.channelName).toBe('cart_user-123');
      expect(RealtimeService['subscriptions'].has('cart')).toBe(true);
    });

    it('should handle multiple cart subscription calls', async () => {
      const result1 = await RealtimeService.subscribeToCartUpdates();
      const result2 = await RealtimeService.subscribeToCartUpdates();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(RealtimeService['subscriptions'].size).toBe(1); // Only one subscription
    });

    it('should not subscribe when user is not authenticated', async () => {
      supabaseMock.setAuthState(null, null);

      const result = await RealtimeService.subscribeToCartUpdates();

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not authenticated');
    });
  });

  describe('initializeAllSubscriptions', () => {
    it('should initialize all subscriptions concurrently', async () => {
      const result = await RealtimeService.initializeAllSubscriptions();

      expect(result.success).toBe(true);
      expect(result.subscribed).toContain('orders');
      expect(result.subscribed).toContain('products');
      expect(result.subscribed).toContain('cart');
      expect(RealtimeService['isInitialized']).toBe(true);
    });

    it('should handle initialization errors', async () => {
      // Mock auth failure
      supabaseMock.setAuthState(null, null);

      const result = await RealtimeService.initializeAllSubscriptions();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle partial initialization failures', async () => {
      // Mock one subscription to fail
      const originalChannel = supabaseMock.channel;
      let callCount = 0;
      supabaseMock.channel = jest.fn((name) => {
        callCount++;
        if (callCount === 2) { // Fail second call (products)
          throw new Error('Products subscription failed');
        }
        return originalChannel(name);
      });

      const result = await RealtimeService.initializeAllSubscriptions();

      expect(result.success).toBe(true); // Partial success
      expect(result.subscribed).toContain('orders');
      expect(result.subscribed).toContain('cart');
      expect(result.failed).toContain('products');

      // Restore original
      supabaseMock.channel = originalChannel;
    });
  });

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all active subscriptions', async () => {
      // First initialize subscriptions
      await RealtimeService.initializeAllSubscriptions();
      expect(RealtimeService['subscriptions'].size).toBeGreaterThan(0);

      const result = await RealtimeService.unsubscribeAll();

      expect(result.success).toBe(true);
      expect(RealtimeService['subscriptions'].size).toBe(0);
      expect(RealtimeService['isInitialized']).toBe(false);
    });

    it('should handle unsubscribe errors gracefully', async () => {
      // Initialize subscription with mock error
      await RealtimeService.initializeAllSubscriptions();
      
      // Mock unsubscribe to throw error
      const subscriptions = Array.from(RealtimeService['subscriptions'].values());
      subscriptions[0].unsubscribe = jest.fn(() => {
        throw new Error('Unsubscribe failed');
      });

      const result = await RealtimeService.unsubscribeAll();

      expect(result.success).toBe(true); // Should still succeed
      expect(RealtimeService['subscriptions'].size).toBe(0);
    });
  });

  describe('Event handling', () => {
    it('should handle order update events', async () => {
      await RealtimeService.subscribeToOrderUpdates();

      // Get the subscription and trigger an event
      const subscription = RealtimeService['subscriptions'].get('orders');
      const eventHandler = subscription.on.mock.calls[0][1];

      const mockEvent = {
        eventType: 'UPDATE',
        new: { ...testOrder, status: 'ready' },
        old: testOrder
      };

      eventHandler(mockEvent);

      // Should invalidate order queries
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(['orders']);
    });

    it('should handle product update events', async () => {
      await RealtimeService.subscribeToProductUpdates();

      const subscription = RealtimeService['subscriptions'].get('products');
      const eventHandler = subscription.on.mock.calls[0][1];

      const mockEvent = {
        eventType: 'INSERT',
        new: { id: 'product-new', name: 'New Product' }
      };

      eventHandler(mockEvent);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(['products']);
    });

    it('should handle cart update events', async () => {
      await RealtimeService.subscribeToCartUpdates();

      const subscription = RealtimeService['subscriptions'].get('cart');
      const eventHandler = subscription.on.mock.calls[0][1];

      const mockEvent = {
        eventType: 'UPDATE',
        new: { user_id: 'user-123', items: [] }
      };

      eventHandler(mockEvent);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(['cart', 'user-123']);
    });
  });

  describe('Authentication state changes', () => {
    it('should reinitialize subscriptions on user login', async () => {
      // Start with no auth
      supabaseMock.setAuthState(null, null);
      await RealtimeService.initializeAllSubscriptions();
      expect(RealtimeService['subscriptions'].size).toBe(0);

      // Simulate login
      supabaseMock.setAuthState(testUser, { user: testUser });
      await RealtimeService.handleAuthChange('SIGNED_IN', { user: testUser });

      expect(RealtimeService['subscriptions'].size).toBeGreaterThan(0);
    });

    it('should clean up subscriptions on user logout', async () => {
      // Start with authenticated user
      await RealtimeService.initializeAllSubscriptions();
      expect(RealtimeService['subscriptions'].size).toBeGreaterThan(0);

      // Simulate logout
      await RealtimeService.handleAuthChange('SIGNED_OUT', null);

      expect(RealtimeService['subscriptions'].size).toBe(0);
      expect(RealtimeService['isInitialized']).toBe(false);
    });
  });

  describe('Error resilience', () => {
    it('should retry failed subscriptions', async () => {
      let attempts = 0;
      const originalChannel = supabaseMock.channel;
      supabaseMock.channel = jest.fn((name) => {
        attempts++;
        if (attempts === 1) {
          throw new Error('First attempt failed');
        }
        return originalChannel(name);
      });

      const result = await RealtimeService.subscribeToOrderUpdates();

      expect(result.success).toBe(true);
      expect(attempts).toBe(2); // Should retry once

      // Restore original
      supabaseMock.channel = originalChannel;
    });

    it('should handle network reconnection', async () => {
      await RealtimeService.initializeAllSubscriptions();

      // Simulate network disconnection
      const subscriptions = Array.from(RealtimeService['subscriptions'].values());
      subscriptions.forEach(sub => {
        sub.state = 'closed';
      });

      // Simulate reconnection
      await RealtimeService.handleNetworkReconnection();

      // Should attempt to resubscribe
      expect(RealtimeService['subscriptions'].size).toBeGreaterThan(0);
    });
  });
});