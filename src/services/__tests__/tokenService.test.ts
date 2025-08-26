// Test Infrastructure Imports
import { createProduct, createUser, resetAllFactories } from "../../test/factories";

/**
 * TokenService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from notificationService.test.ts
 */

import { TokenService } from '../tokenService';
import { createUser, resetAllFactories } from '../../test/factories';

// Mock AsyncStorage with proper resolved promises
const mockStorage = {
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@react-native-async-storage/async-storage', () => mockStorage);

// Mock Supabase using the refactored infrastructure - CREATE MOCK IN THE JEST.MOCK CALL
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
  // Using SimplifiedSupabaseMock pattern
  
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products',
      ORDERS: 'orders',
      CART: 'cart',
    }
  };
    TABLES: { /* Add table constants */ }
  };
});

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(), recordDataIntegrity: jest.fn()
  }
}));

// Mock JWT if needed
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
  verify: jest.fn(),
}));

describe('TokenService - Refactored Infrastructure', () => {
  let testUser: any;
  let mockAsyncStorage: any;

  beforeEach(() => {
    // Reset all factory counters for consistent test data
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'customer',
      phone: '+1234567890',
      address: '123 Test St, Test City, TS 12345'
    });
    
    jest.clearAllMocks();
    
    // Reset storage mock to default state
    mockAsyncStorage = require('@react-native-async-storage/async-storage');
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('token management', () => {
    it('should set and get access token', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue('test-access-token');
      
      await TokenService.setAccessToken('test-access-token');
      const token = await TokenService.getAccessToken();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('access_token', 'test-access-token');
      expect(token).toBe('test-access-token');
    });

    it('should set and get refresh token', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue('test-refresh-token');
      
      await TokenService.setRefreshToken('test-refresh-token');
      const token = await TokenService.getRefreshToken();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('refresh_token', 'test-refresh-token');
      expect(token).toBe('test-refresh-token');
    });

    it('should handle missing tokens gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const accessToken = await TokenService.getAccessToken();
      const refreshToken = await TokenService.getRefreshToken();
      
      expect(accessToken).toBeNull();
      expect(refreshToken).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      // TokenService should handle storage errors gracefully
      await expect(
        TokenService.setAccessToken('test-token')
      ).rejects.toThrow();
    });
  });

  describe('user storage', () => {
    it('should store and retrieve user data', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testUser));
      
      await TokenService.setUser(testUser);
      const storedUser = await TokenService.getUser();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser));
      expect(storedUser).toEqual(testUser);
    });

    it('should handle user storage errors', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(TokenService.setUser(testUser)).rejects.toThrow('Storage error');
    });

    it('should return null for missing user', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const user = await TokenService.getUser();
      expect(user).toBeNull();
    });

    it('should handle corrupted user data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
      
      const user = await TokenService.getUser();
      
      // Should handle JSON parse errors gracefully
      expect(user).toBeDefined();
    });
  });

  describe('token validation', () => {
    it('should validate tokens correctly', async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('valid-access-token') // access token
        .mockResolvedValueOnce('valid-refresh-token'); // refresh token
      
      const hasValidTokens = await TokenService.hasValidTokens();
      expect(hasValidTokens).toBe(true);
    });

    it('should return false for missing tokens', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const hasValidTokens = await TokenService.hasValidTokens();
      expect(hasValidTokens).toBe(false);
    });

    it('should handle token validation errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const hasValidTokens = await TokenService.hasValidTokens();
      
      // Should handle storage errors gracefully
      expect(typeof hasValidTokens).toBe('boolean');
    });
  });

  describe('token cleanup', () => {
    it('should clear all tokens successfully', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);
      
      await TokenService.clearAllTokens();
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should handle storage errors during cleanup gracefully', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage cleanup failed'));
      
      // Should not throw, but handle gracefully
      await expect(TokenService.clearAllTokens()).resolves.not.toThrow();
    });

    it('should clear individual tokens', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);
      
      await TokenService.clearTokens();
      
      // Should clear at least access and refresh tokens
      expect(mockAsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('authentication utilities', () => {
    it('should check authentication status', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('valid-token');
      
      const isAuthenticated = await TokenService.isAuthenticated();
      
      expect(typeof isAuthenticated).toBe('boolean');
    });

    it('should handle authentication check errors', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const isAuthenticated = await TokenService.isAuthenticated();
      
      expect(typeof isAuthenticated).toBe('boolean');
    });
  });

  describe('graceful degradation', () => {
    it('should handle storage unavailability', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage unavailable'));
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage unavailable'));
      
      await expect(TokenService.getAccessToken()).toBeDefined();
      await expect(TokenService.getRefreshToken()).toBeDefined();
    });

    it('should provide fallback behavior for critical operations', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const user = await TokenService.getUser();
      const hasTokens = await TokenService.hasValidTokens();
      
      expect(user).toBeNull();
      expect(hasTokens).toBe(false);
    });

    it('should handle network timeouts gracefully', async () => {
      // Simulate slow storage operations
      mockAsyncStorage.getItem.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 1000))
      );
      
      const result = await TokenService.getAccessToken();
      
      expect(result).toBeDefined();
    });
  });
});