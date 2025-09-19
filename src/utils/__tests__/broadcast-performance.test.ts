/**
 * Broadcast Performance Test
 * Verifies that order status broadcast performance improvements work correctly
 */

import { describe, it, expect, jest } from '@jest/globals';
import * as BroadcastFactory from '../broadcastFactory';

const { sendMultiTargetBroadcast, SecureChannelNameGenerator } = BroadcastFactory;

// Mock Supabase
const mockSend = jest.fn();
const mockChannel = jest.fn().mockReturnValue({
  send: mockSend
});

jest.mock('../../config/supabase', () => ({
  supabase: {
    channel: mockChannel
  }
}));

// Mock Constants for channel secret
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      channelSecret: '1234567890123456789012345678901234567890123456789012345678901234' // 64 chars
    }
  }
}));

describe('Broadcast Performance Improvements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ status: 'ok' });
  });

  describe('Parallel Broadcasting', () => {
    it('should send multiple target broadcasts in parallel', async () => {
      const startTime = Date.now();
      
      // Mock a delay for each broadcast to simulate network latency
      mockSend.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ status: 'ok' }), 100))
      );

      const results = await sendMultiTargetBroadcast(
        'orders',
        'order-status-updated',
        { 
          userId: 'test-user-123',
          orderId: 'order-456',
          status: 'READY',
          timestamp: new Date().toISOString(),
          action: 'status_updated'
        },
        ['user-specific', 'admin-only']
      );

      const duration = Date.now() - startTime;
      
      // Should complete in ~100ms (parallel) rather than ~200ms (sequential)
      expect(duration).toBeLessThan(150); // Allow some overhead
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      // Verify both broadcasts were attempted
      expect(mockChannel).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success/failure results in parallel broadcasts', async () => {
      // First call succeeds, second fails
      mockSend
        .mockResolvedValueOnce({ status: 'ok' })
        .mockRejectedValueOnce(new Error('Network error'));

      const results = await sendMultiTargetBroadcast(
        'orders',
        'order-status-updated',
        { 
          userId: 'test-user-123',
          orderId: 'order-456',
          status: 'READY',
          action: 'status_updated'
        },
        ['user-specific', 'admin-only']
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeInstanceOf(Error);
    });
  });

  describe('Channel Name Caching', () => {
    it('should cache channel names to avoid repeated HMAC calculations', () => {
      const entity = 'orders';
      const target = 'user-specific';
      const userId = 'test-user-123';

      // First call should generate the name
      const startTime1 = performance.now();
      const name1 = SecureChannelNameGenerator.generateSecureChannelName(entity, target, userId);
      const duration1 = performance.now() - startTime1;

      // Second call should be cached (much faster)
      const startTime2 = performance.now();
      const name2 = SecureChannelNameGenerator.generateSecureChannelName(entity, target, userId);
      const duration2 = performance.now() - startTime2;

      // Names should be identical
      expect(name1).toBe(name2);
      
      // Cached call should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.5);
      
      // Verify the cached name has the expected format
      expect(name1).toMatch(/^sec-orders-[a-f0-9]{16}$/);
    });

    it('should cache backup channel names separately', () => {
      const entity = 'orders';
      const target = 'admin-only';

      const primaryName = SecureChannelNameGenerator.generateSecureChannelName(entity, target);
      const backupName = SecureChannelNameGenerator.generateBackupChannelName(entity, target);

      // Names should be different but both cached
      expect(primaryName).not.toBe(backupName);
      expect(primaryName).toMatch(/^sec-orders-admin-[a-f0-9]{12}$/);
      expect(backupName).toMatch(/^sec-orders-admin-bkp-[a-f0-9]{12}$/);

      // Second calls should return identical cached values
      expect(SecureChannelNameGenerator.generateSecureChannelName(entity, target)).toBe(primaryName);
      expect(SecureChannelNameGenerator.generateBackupChannelName(entity, target)).toBe(backupName);
    });

    it('should use different cache keys for different entities/targets/users', () => {
      const user1Channel = SecureChannelNameGenerator.generateSecureChannelName('orders', 'user-specific', 'user1');
      const user2Channel = SecureChannelNameGenerator.generateSecureChannelName('orders', 'user-specific', 'user2');
      const adminChannel = SecureChannelNameGenerator.generateSecureChannelName('orders', 'admin-only');
      const cartChannel = SecureChannelNameGenerator.generateSecureChannelName('cart', 'user-specific', 'user1');

      // All should be different
      const channels = [user1Channel, user2Channel, adminChannel, cartChannel];
      const uniqueChannels = new Set(channels);
      expect(uniqueChannels.size).toBe(4);
    });
  });

  describe('Performance Monitoring', () => {
    it('should log performance metrics for multi-target broadcasts', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockSend.mockResolvedValue({ status: 'ok' });

      await sendMultiTargetBroadcast(
        'orders',
        'order-status-updated',
        { 
          userId: 'test-user-123',
          orderId: 'order-456',
          status: 'READY',
          action: 'status_updated'
        },
        ['user-specific', 'admin-only']
      );

      // Should log performance metrics
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multi-target broadcast for orders.order-status-updated completed in'),
        expect.stringContaining('ms (2 targets)')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully without blocking other broadcasts', async () => {
      // Mock one broadcast to fail
      mockSend
        .mockResolvedValueOnce({ status: 'ok' })
        .mockRejectedValueOnce(new Error('Channel error'));

      const results = await sendMultiTargetBroadcast(
        'orders',
        'order-status-updated',
        { 
          userId: 'test-user-123',
          orderId: 'order-456',
          status: 'READY',
          action: 'status_updated'
        },
        ['user-specific', 'admin-only']
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error.message).toBe('Channel error');
    });
  });
});