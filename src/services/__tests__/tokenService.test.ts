/**
 * TokenService Test - REFACTORED
 * Testing token management functionality using simplified mocks and factories
 */

import { TokenService } from '../tokenService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createUser, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('TokenService - Refactored', () => {
  let supabaseMock: any;
  let testUser: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data with factories
    testUser = createUser({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    });
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      users: [testUser]
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
    
    // Clear other mocks
    jest.clearAllMocks();
  });

  describe('token management', () => {
    it('should set and get access token', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.setItem.mockResolvedValue(null);
      mockStorage.getItem.mockResolvedValue('test-access-token');
      
      await TokenService.setAccessToken('test-access-token');
      const token = await TokenService.getAccessToken();
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('access_token', 'test-access-token');
      expect(token).toBe('test-access-token');
    });

    it('should set and get refresh token', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.setItem.mockResolvedValue(null);
      mockStorage.getItem.mockResolvedValue('test-refresh-token');
      
      await TokenService.setRefreshToken('test-refresh-token');
      const token = await TokenService.getRefreshToken();
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('refresh_token', 'test-refresh-token');
      expect(token).toBe('test-refresh-token');
    });

    it('should handle missing tokens gracefully', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.getItem.mockResolvedValue(null);
      
      const accessToken = await TokenService.getAccessToken();
      const refreshToken = await TokenService.getRefreshToken();
      
      expect(accessToken).toBeNull();
      expect(refreshToken).toBeNull();
    });
  });

  describe('user storage', () => {
    it('should store and retrieve user data', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.setItem.mockResolvedValue(null);
      mockStorage.getItem.mockResolvedValue(JSON.stringify(testUser));
      
      await TokenService.setUser(testUser);
      const storedUser = await TokenService.getUser();
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser));
      expect(storedUser).toEqual(testUser);
    });

    it('should handle user storage errors', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(TokenService.setUser(testUser)).rejects.toThrow('Storage error');
    });

    it('should return null for missing user', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.getItem.mockResolvedValue(null);
      
      const user = await TokenService.getUser();
      expect(user).toBeNull();
    });
  });

  describe('token validation', () => {
    it('should validate tokens correctly', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.getItem
        .mockResolvedValueOnce('valid-access-token') // access token
        .mockResolvedValueOnce('valid-refresh-token'); // refresh token
      
      const hasValidTokens = await TokenService.hasValidTokens();
      expect(hasValidTokens).toBe(true);
    });

    it('should return false for missing tokens', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.getItem.mockResolvedValue(null);
      
      const hasValidTokens = await TokenService.hasValidTokens();
      expect(hasValidTokens).toBe(false);
    });

    it('should return false for expired tokens', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      const expiredToken = 'expired.jwt.token'; // Mock expired JWT
      mockStorage.getItem.mockResolvedValue(expiredToken);
      
      // Mock JWT decode to return expired token
      const mockJwt = require('jsonwebtoken');
      if (mockJwt?.decode) {
        mockJwt.decode.mockReturnValue({ 
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        });
      }
      
      const hasValidTokens = await TokenService.hasValidTokens();
      expect(hasValidTokens).toBe(false);
    });
  });

  describe('token cleanup', () => {
    it('should clear all tokens successfully', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.removeItem.mockResolvedValue(null);
      
      await TokenService.clearAllTokens();
      
      expect(mockStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should handle storage errors during cleanup', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.removeItem.mockRejectedValue(new Error('Storage cleanup failed'));
      
      // Should not throw, but handle gracefully
      await expect(TokenService.clearAllTokens()).resolves.not.toThrow();
    });
  });

  describe('token refresh', () => {
    it('should refresh tokens using refresh token', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.getItem.mockResolvedValue('valid-refresh-token');
      
      // Mock supabase auth refresh
      supabaseMock.auth.refreshSession = jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            user: testUser
          }
        },
        error: null
      });
      
      mockStorage.setItem.mockResolvedValue(null);
      
      const result = await TokenService.refreshTokens();
      
      expect(result.success).toBe(true);
      expect(result.tokens.accessToken).toBe('new-access-token');
      expect(result.tokens.refreshToken).toBe('new-refresh-token');
    });

    it('should handle refresh token failure', async () => {
      const mockStorage = require('@react-native-async-storage/async-storage');
      mockStorage.getItem.mockResolvedValue('invalid-refresh-token');
      
      // Mock supabase auth refresh failure
      supabaseMock.auth.refreshSession = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid refresh token' }
      });
      
      const result = await TokenService.refreshTokens();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });
  });
});

/**
 * Benefits of this refactored approach:
 * 
 * 1. **Factory Usage**: User data from validated factories
 * 2. **Simplified Mocks**: AsyncStorage and Supabase mocked simply
 * 3. **Comprehensive Coverage**: Token validation, refresh, storage errors
 * 4. **Error Handling**: Graceful degradation for storage failures
 * 5. **Real-world Scenarios**: Token expiration, refresh failures
 */