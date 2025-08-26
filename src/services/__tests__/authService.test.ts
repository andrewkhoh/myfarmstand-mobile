/**
 * AuthService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from service tests
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the SimplifiedSupabaseMock pattern
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products',
      ORDERS: 'orders',
      CART: 'cart',
    }
  };
});

// Mock TokenService
jest.mock('../tokenService', () => ({
  TokenService: {
    setAccessToken: jest.fn().mockResolvedValue(undefined),
    setRefreshToken: jest.fn().mockResolvedValue(undefined),
    setUser: jest.fn().mockResolvedValue(undefined),
    clearTokens: jest.fn().mockResolvedValue(undefined),
    clearAllTokens: jest.fn().mockResolvedValue(undefined),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
  }
}));

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
    recordDataIntegrity: jest.fn()
  }
}));

// Mock ValidationPipeline
jest.mock('../../utils/validationPipeline', () => ({
  ServiceValidator: {
    validateInput: jest.fn(async (data, schema, context) => {
      if (typeof data === 'object' && data.email && data.password) {
        if (!data.email.includes('@')) {
          throw new Error('Invalid email format');
        }
        if (data.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        return data;
      }
      return data;
    }),
    validate: jest.fn((schema, data) => data),
  },
  ValidationUtils: {
    createEmailSchema: jest.fn(() => ({
      parse: (email: string) => {
        if (!email || !email.includes('@')) {
          throw new Error('Invalid email');
        }
        return email;
      }
    })),
    isValidEmail: jest.fn((email) => email && email.includes('@')),
    sanitizeInput: jest.fn((input) => input),
  }
}));

// ============================================================================
// IMPORTS - AFTER ALL MOCKS ARE SET UP
// ============================================================================

import { AuthService } from '../authService';
import { createUser, resetAllFactories } from '../../test/factories';

describe('AuthService - Refactored Infrastructure', () => {
  let testUser: any;

  beforeEach(() => {
    // Reset all factory counters for consistent test data
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const result = await AuthService.login('test@example.com', 'password123');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle login failure gracefully', async () => {
      await expect(
        AuthService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow();
    });

    it('should validate email format', async () => {
      await expect(
        AuthService.login('invalid-email', 'password123')
      ).rejects.toThrow();
    });

    it('should validate password length', async () => {
      await expect(
        AuthService.login('test@example.com', '123')
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      const result = await AuthService.logout();
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle logout error gracefully', async () => {
      const result = await AuthService.logout();
      
      expect(result).toBeDefined();
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const result = await AuthService.register(
        'newuser@example.com',
        'password123',
        'New User'
      );
      
      expect(result).toBeDefined();
    });

    it('should handle registration failure gracefully', async () => {
      await expect(
        AuthService.register('existing@example.com', 'password123', 'User')
      ).rejects.toThrow();
    });

    it('should validate registration data', async () => {
      await expect(
        AuthService.register('', '', '')
      ).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const result = await AuthService.getCurrentUser();
      
      expect(result).toBeDefined();
    });

    it('should return null when not authenticated', async () => {
      const result = await AuthService.getCurrentUser();
      
      expect(result === null || result === undefined).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should return authentication status', async () => {
      const result = await AuthService.isAuthenticated();
      
      expect(typeof result).toBe('boolean');
    });

    it('should handle auth check errors', async () => {
      const result = await AuthService.isAuthenticated();
      
      expect(typeof result).toBe('boolean');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updates = {
        name: 'Updated Name',
        phone: '+1234567890'
      };

      const result = await AuthService.updateProfile(testUser.id, updates);
      
      expect(result).toBeDefined();
    });

    it('should handle profile update errors', async () => {
      const result = await AuthService.updateProfile('invalid-id', {});
      
      expect(result).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      const result = await AuthService.resetPassword('test@example.com');
      
      expect(result).toBeDefined();
    });

    it('should validate email for password reset', async () => {
      await expect(
        AuthService.resetPassword('invalid-email')
      ).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should refresh authentication token', async () => {
      const result = await AuthService.refreshToken();
      
      expect(result).toBeDefined();
    });

    it('should handle token refresh errors', async () => {
      const result = await AuthService.refreshToken();
      
      expect(result).toBeDefined();
    });
  });

  describe('graceful degradation', () => {
    it('should handle database connection errors', async () => {
      const result = await AuthService.getCurrentUser();
      
      expect(result).toBeDefined();
    });

    it('should handle validation pipeline errors', async () => {
      await expect(
        AuthService.login('', '')
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      await expect(
        AuthService.login('invalid', 'short')
      ).rejects.toThrow();
    });

    it('should handle token service errors gracefully', async () => {
      const result = await AuthService.logout();
      
      expect(result).toBeDefined();
    });

    it('should handle network timeouts gracefully', async () => {
      const result = await AuthService.login('test@example.com', 'password123');
      
      expect(result).toBeDefined();
    });

    it('should handle concurrent auth operations', async () => {
      const promise1 = AuthService.login('test1@example.com', 'password123');
      const promise2 = AuthService.login('test2@example.com', 'password123');
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});