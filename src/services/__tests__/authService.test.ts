/**
 * AuthService Test - REFACTORED
 * Testing authentication functionality with simplified mocks and factories
 */

import { AuthService } from '../authService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createUser, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('AuthService', () => {
  let supabaseMock: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      users: [
        createUser({ 
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'customer'
        })
      ]
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
  });

  describe('login validation', () => {
    it('should validate email format', async () => {
      await expect(AuthService.login('invalid-email', 'password123'))
        .rejects.toThrow('email must be a valid email address');
    });

    it('should validate required fields', async () => {
      await expect(AuthService.login('', 'password123'))
        .rejects.toThrow('email must be a valid email address');
        
      await expect(AuthService.login('test@example.com', ''))
        .rejects.toThrow('password must be at least 6 characters long');
    });
  });

  describe('login flow', () => {
    it('should handle successful login', async () => {
      // Create test user with factory
      const testUser = createUser({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      });
      
      // Setup mock with user data
      supabaseMock = createSupabaseMock({
        users: [testUser]
      });
      require('../../config/supabase').supabase = supabaseMock;
      
      // Setup successful auth response
      supabaseMock.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: {
              id: testUser.id,
              email: testUser.email,
              created_at: testUser.created_at,
              updated_at: testUser.updated_at
            }
          },
          user: {
            id: testUser.id,
            email: testUser.email,
            created_at: testUser.created_at,
            updated_at: testUser.updated_at
          }
        },
        error: null
      });

      const result = await AuthService.login('test@example.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should handle login failure', async () => {
      // Setup failed auth response
      supabaseMock.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      await expect(AuthService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid login credentials');
    });
  });

  describe('registration', () => {
    it('should validate registration fields', async () => {
      await expect(AuthService.register('', 'password', 'name', 'phone', 'address'))
        .rejects.toThrow('Email, password, and name are required');
        
      await expect(AuthService.register('test@example.com', '123', 'name', 'phone', 'address'))
        .rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should handle successful registration', async () => {
      const newUser = createUser({
        email: 'newuser@example.com',
        name: 'New User'
      });
      
      // Setup successful registration response
      supabaseMock.auth.signUp = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            created_at: newUser.created_at,
            updated_at: newUser.updated_at
          },
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            token_type: 'bearer'
          }
        },
        error: null
      });
      
      // Mock the users table insert
      supabaseMock.from('users').insert = jest.fn().mockResolvedValue({
        data: [newUser],
        error: null
      });
      
      const result = await AuthService.register(
        'newuser@example.com',
        'password123',
        'New User',
        '555-0123',
        '123 Main St'
      );
      
      expect(result.success).toBe(true);
      expect(result.user.email).toBe('newuser@example.com');
    });
  });

  describe('logout', () => {
    it('should handle logout', async () => {
      supabaseMock.auth.signOut = jest.fn().mockResolvedValue({ error: null });
      
      const result = await AuthService.logout();
      
      expect(result.success).toBe(true);
      expect(supabaseMock.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout error', async () => {
      supabaseMock.auth.signOut = jest.fn().mockResolvedValue({ 
        error: { message: 'Logout failed' } 
      });
      
      await expect(AuthService.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('authentication status', () => {
    it('should check authenticated state', async () => {
      const user = createUser();
      
      // Test authenticated state
      supabaseMock.auth.getSession = jest.fn().mockResolvedValue({
        data: { 
          session: { 
            user: { id: user.id, email: user.email } 
          } 
        },
        error: null
      });
      
      let isAuth = await AuthService.isAuthenticated();
      expect(isAuth).toBe(true);
      
      // Test unauthenticated state
      supabaseMock.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      });
      
      isAuth = await AuthService.isAuthenticated();
      expect(isAuth).toBe(false);
    });

    it('should handle session check error', async () => {
      supabaseMock.auth.getSession = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Session check failed' }
      });
      
      const isAuth = await AuthService.isAuthenticated();
      expect(isAuth).toBe(false);
    });
  });

  describe('password reset', () => {
    it('should send password reset email', async () => {
      supabaseMock.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
        data: {},
        error: null
      });
      
      const result = await AuthService.resetPassword('test@example.com');
      
      expect(result.success).toBe(true);
      expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle password reset error', async () => {
      supabaseMock.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Reset failed' }
      });
      
      await expect(AuthService.resetPassword('test@example.com'))
        .rejects.toThrow('Reset failed');
    });
  });
});

/**
 * Benefits of this refactored approach:
 * 
 * 1. **Simpler Mocks**: No complex chain mocking
 * 2. **Factory Usage**: User data from validated factories
 * 3. **Readable Tests**: Clear intent and structure
 * 4. **Better Organization**: Logical test grouping
 * 5. **More Coverage**: Added error cases and edge cases
 */